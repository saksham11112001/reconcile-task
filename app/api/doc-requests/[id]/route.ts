import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/admin'

interface Ctx { params: Promise<{ id: string }> }

// PATCH /api/doc-requests/[id]
// Body: { status?, description?, due_date?, title? }
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
    const allowed: Record<string, unknown> = {}
    const validStatuses = ['requested','received','pending','overdue','cancelled']

    if (body.title       !== undefined) allowed.title       = body.title?.trim() || null
    if (body.description !== undefined) allowed.description = body.description?.trim() || null
    if (body.due_date    !== undefined) allowed.due_date    = body.due_date || null
    if (body.status !== undefined) {
      if (!validStatuses.includes(body.status))
        return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
      allowed.status = body.status
      if (body.status === 'received') allowed.responded_at = new Date().toISOString()
    }
    allowed.updated_at = new Date().toISOString()

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('doc_requests')
      .update(allowed)
      .eq('id', id)
      .eq('org_id', mb.org_id)
      .select()
      .single()

    if (error) throw error
    if (!data)  return NextResponse.json({ error: 'Not found.' }, { status: 404 })

    // Audit log for status transitions
    if (body.status) {
      const actionMap: Record<string, string> = {
        received:  'doc_received',
        cancelled: 'doc_cancelled',
      }
      const action = actionMap[body.status] ?? 'doc_requested'
      const { data: profile } = await supabase
        .from('users').select('name').eq('id', user.id).maybeSingle()
      await admin.from('audit_logs').insert({
        org_id:      mb.org_id,
        entity_type: 'doc_request',
        entity_id:   id,
        action,
        actor_id:    user.id,
        actor_name:  (profile as { name?: string } | null)?.name ?? null,
        meta:        { title: data.title, new_status: body.status },
      })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[doc-requests PATCH]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// DELETE /api/doc-requests/[id]
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: mb } = await supabase
      .from('org_members').select('org_id, role')
      .eq('user_id', user.id).eq('is_active', true).maybeSingle()
    if (!mb) return NextResponse.json({ error: 'No org' }, { status: 403 })
    if (!['owner','admin'].includes(mb.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = createAdminClient()
    const { error } = await admin
      .from('doc_requests')
      .delete()
      .eq('id', id)
      .eq('org_id', mb.org_id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[doc-requests DELETE]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
