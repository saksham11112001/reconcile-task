import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/admin'

interface Ctx { params: Promise<{ id: string }> }

const DECISION_TO_STATUS: Record<string, string> = {
  resolved:  'resolved',
  ignored:   'ignored',
  escalated: 'escalated',
  reopened:  'open',
}

// POST /api/reconciliations/[id]/mismatches/bulk
// Body: { ids: string[]; decision: 'resolved'|'ignored'|'escalated'|'reopened'; note?: string }
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

    const body = await request.json()
    const { ids, decision, note } = body

    if (!Array.isArray(ids) || ids.length === 0)
      return NextResponse.json({ error: 'ids must be a non-empty array.' }, { status: 400 })
    if (ids.length > 200)
      return NextResponse.json({ error: 'Maximum 200 items per bulk operation.' }, { status: 400 })

    const validDecisions = ['resolved','ignored','escalated','reopened']
    if (!validDecisions.includes(decision))
      return NextResponse.json({ error: 'Invalid decision.' }, { status: 400 })

    const newStatus = DECISION_TO_STATUS[decision]
    const admin     = createAdminClient()

    // Bulk update status
    const { error: updateErr } = await admin
      .from('recon_mismatches')
      .update({ review_status: newStatus })
      .in('id', ids)
      .eq('reconciliation_id', id)
      .eq('org_id', mb.org_id)

    if (updateErr) throw updateErr

    // Insert decision log rows
    const logRows = ids.map((mismatchId: string) => ({
      org_id:      mb.org_id,
      mismatch_id: mismatchId,
      decision,
      note:        note?.trim() || null,
      decided_by:  user.id,
    }))

    await admin.from('recon_mismatch_decisions').insert(logRows)

    // Re-sync open_mismatches counter
    const { count: openCount } = await admin
      .from('recon_mismatches')
      .select('*', { count: 'exact', head: true })
      .eq('reconciliation_id', id)
      .eq('review_status', 'open')

    await admin
      .from('reconciliations')
      .update({ open_mismatches: openCount ?? 0 })
      .eq('id', id)

    // Audit log
    const { data: profile } = await supabase
      .from('users').select('name').eq('id', user.id).maybeSingle()
    await admin.from('audit_logs').insert({
      org_id:      mb.org_id,
      entity_type: 'reconciliation',
      entity_id:   id,
      action:      `mismatch_${decision}` as string,
      actor_id:    user.id,
      actor_name:  (profile as { name?: string } | null)?.name ?? null,
      meta:        { bulk: true, count: ids.length, decision },
    })

    return NextResponse.json({ updated: ids.length, open_mismatches: openCount ?? 0 })
  } catch (err) {
    console.error('[mismatches bulk POST]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
