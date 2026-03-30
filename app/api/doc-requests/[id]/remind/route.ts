import { NextResponse }          from 'next/server'
import { createClient }          from '@/lib/supabase/api'
import { createAdminClient }     from '@/lib/supabase/admin'
import { sendClientDocReminder } from '@/lib/email/templates/client-doc-reminder'

interface Ctx { params: Promise<{ id: string }> }

// POST /api/doc-requests/[id]/remind
// Sends a reminder email to the client contact for this doc request.
// Body: { note?: string }  — optional custom message (ignored for now, reserved)
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
    if (!['owner', 'admin', 'reviewer', 'analyst'].includes(mb.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = createAdminClient()

    // Fetch the doc request
    const { data: dr } = await admin
      .from('doc_requests')
      .select('*, clients(name, email, contact_person), reconciliations(name)')
      .eq('id', id)
      .eq('org_id', mb.org_id)
      .maybeSingle()

    if (!dr) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    if (['received', 'cancelled'].includes(dr.status))
      return NextResponse.json({ error: 'Cannot remind — request is already resolved.' }, { status: 409 })

    const clientRow = dr.clients as { name?: string; email?: string | null; contact_person?: string | null } | null
    const clientEmail = clientRow?.email
    if (!clientEmail)
      return NextResponse.json({ error: 'Client has no contact email on file.' }, { status: 422 })

    // Fetch org name
    const { data: orgRow } = await admin
      .from('organisations').select('name').eq('id', mb.org_id).maybeSingle()
    const orgName = (orgRow as { name?: string } | null)?.name ?? 'Your CA firm'

    const clientName = clientRow?.contact_person || clientRow?.name || 'there'
    const reconRow   = dr.reconciliations as { name?: string } | null
    const reconName  = reconRow?.name ?? null
    const isOverdue  = dr.status === 'overdue'
    const fmtDue     = dr.due_date
      ? new Date(dr.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : null

    await sendClientDocReminder({
      to:           clientEmail,
      clientName,
      orgName,
      requestTitle: dr.title,
      description:  dr.description ?? null,
      dueDate:      fmtDue,
      isOverdue,
      reconName,
      requestId:    dr.id,
    })

    // Audit log
    const { data: profile } = await supabase
      .from('users').select('name').eq('id', user.id).maybeSingle()
    await admin.from('audit_logs').insert({
      org_id:      mb.org_id,
      entity_type: 'doc_request',
      entity_id:   id,
      action:      'doc_reminder_sent',
      actor_id:    user.id,
      actor_name:  (profile as { name?: string } | null)?.name ?? null,
      meta:        { title: dr.title, sent_to: clientEmail },
    })

    return NextResponse.json({ ok: true, sent_to: clientEmail })
  } catch (err) {
    console.error('[doc-request remind]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
