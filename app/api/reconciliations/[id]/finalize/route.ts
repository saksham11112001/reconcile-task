import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/admin'

interface Ctx { params: Promise<{ id: string }> }

// POST /api/reconciliations/[id]/finalize
// Body: { unfinalize?: boolean } — toggles finalization
// Guards: only owner/admin/reviewer; cannot finalize if open mismatches > 0
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: mb } = await supabase
      .from('org_members').select('org_id, role')
      .eq('user_id', user.id).eq('is_active', true).maybeSingle()
    if (!mb) return NextResponse.json({ error: 'No org' }, { status: 403 })

    if (!['owner','admin','reviewer'].includes(mb.role))
      return NextResponse.json({ error: 'Only reviewers, admins and owners can finalize.' }, { status: 403 })

    // Fetch current recon state
    const { data: recon } = await supabase
      .from('reconciliations')
      .select('id, org_id, is_finalized, open_mismatches, name')
      .eq('id', id)
      .eq('org_id', mb.org_id)
      .maybeSingle()

    if (!recon) return NextResponse.json({ error: 'Reconciliation not found.' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const unfinalize = body.unfinalize === true

    if (!unfinalize && recon.is_finalized)
      return NextResponse.json({ error: 'Already finalized.' }, { status: 400 })

    if (!unfinalize && (recon.open_mismatches ?? 0) > 0)
      return NextResponse.json({
        error: `Cannot finalize: ${recon.open_mismatches} mismatch${recon.open_mismatches !== 1 ? 'es' : ''} still open.`
      }, { status: 400 })

    // Fetch actor name
    const { data: profile } = await supabase
      .from('users').select('name').eq('id', user.id).maybeSingle()

    const admin = createAdminClient()

    const { data: updated, error } = await admin
      .from('reconciliations')
      .update(
        unfinalize
          ? { is_finalized: false, finalized_at: null, finalized_by: null }
          : { is_finalized: true,  finalized_at: new Date().toISOString(), finalized_by: user.id }
      )
      .eq('id', id)
      .select('id, is_finalized, finalized_at, finalized_by')
      .single()

    if (error) throw error

    // Audit log
    await admin.from('audit_logs').insert({
      org_id:      mb.org_id,
      entity_type: 'reconciliation',
      entity_id:   id,
      action:      unfinalize ? 'recon_unfinalized' : 'recon_finalized',
      actor_id:    user.id,
      actor_name:  (profile as { name?: string } | null)?.name ?? null,
      meta:        { recon_name: recon.name },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[finalize POST]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
