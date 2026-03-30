import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/admin'

interface Ctx { params: Promise<{ id: string }> }

// GET /api/reconciliations/[id]/checklist
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: mb } = await supabase
      .from('org_members').select('org_id')
      .eq('user_id', user.id).eq('is_active', true).maybeSingle()
    if (!mb) return NextResponse.json({ error: 'No org' }, { status: 403 })

    const { data } = await supabase
      .from('recon_checklists')
      .select('*')
      .eq('reconciliation_id', id)
      .eq('org_id', mb.org_id)
      .maybeSingle()

    // Return defaults if checklist doesn't exist yet
    if (!data) {
      return NextResponse.json({
        id: null,
        reconciliation_id: id,
        uploads_received:   false,
        review_complete:    false,
        exceptions_handled: false,
        documents_complete: false,
        ready_to_finalize:  false,
        notes: null,
      })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[checklist GET]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// PATCH /api/reconciliations/[id]/checklist
// Body: partial checklist booleans + optional notes
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: mb } = await supabase
      .from('org_members').select('org_id, role')
      .eq('user_id', user.id).eq('is_active', true).maybeSingle()
    if (!mb) return NextResponse.json({ error: 'No org' }, { status: 403 })
    if (!['owner','admin','reviewer','analyst'].includes(mb.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const fields = ['uploads_received','review_complete','exceptions_handled','documents_complete','ready_to_finalize']
    const update: Record<string, unknown> = {
      org_id:            mb.org_id,
      reconciliation_id: id,
      updated_by:        user.id,
      updated_at:        new Date().toISOString(),
    }
    for (const f of fields) {
      if (f in body) update[f] = Boolean(body[f])
    }
    if ('notes' in body) update.notes = body.notes?.trim() || null

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('recon_checklists')
      .upsert(update, { onConflict: 'reconciliation_id' })
      .select()
      .single()

    if (error) throw error

    // Audit log
    const { data: profile } = await supabase
      .from('users').select('name').eq('id', user.id).maybeSingle()
    await admin.from('audit_logs').insert({
      org_id:      mb.org_id,
      entity_type: 'reconciliation',
      entity_id:   id,
      action:      'checklist_updated',
      actor_id:    user.id,
      actor_name:  (profile as { name?: string } | null)?.name ?? null,
      meta:        { updated_fields: Object.keys(body) },
    })

    return NextResponse.json(data)
  } catch (err) {
    console.error('[checklist PATCH]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
