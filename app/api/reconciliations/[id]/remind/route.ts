import { NextResponse }              from 'next/server'
import { createClient }              from '@/lib/supabase/api'
import { createAdminClient }         from '@/lib/supabase/admin'
import { sendClientUploadReminder }  from '@/lib/email/templates/client-upload-reminder'

interface Ctx { params: Promise<{ id: string }> }

// POST /api/reconciliations/[id]/remind
// Sends an upload reminder email to the client linked to this reconciliation.
// Body: { note?: string }  — optional message to include
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

    // Fetch the reconciliation
    const { data: recon } = await admin
      .from('reconciliations')
      .select('*')
      .eq('id', id)
      .eq('org_id', mb.org_id)
      .maybeSingle()

    if (!recon) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    if (!recon.client_id)
      return NextResponse.json({ error: 'No client linked to this reconciliation.' }, { status: 422 })
    if (!['pending', 'uploaded'].includes(recon.job_status))
      return NextResponse.json({ error: 'Reminder only applies to reconciliations awaiting uploads.' }, { status: 409 })

    // Fetch client + org
    const [{ data: clientRow }, { data: orgRow }] = await Promise.all([
      admin.from('clients').select('name, email, contact_person').eq('id', recon.client_id).maybeSingle(),
      admin.from('organisations').select('name').eq('id', mb.org_id).maybeSingle(),
    ])

    const clientEmail = (clientRow as { email?: string | null } | null)?.email
    if (!clientEmail)
      return NextResponse.json({ error: 'Client has no contact email on file.' }, { status: 422 })

    const orgName    = (orgRow as { name?: string } | null)?.name ?? 'Your CA firm'
    const clientName = (clientRow as { contact_person?: string | null; name?: string } | null)?.contact_person
                    || (clientRow as { name?: string } | null)?.name
                    || 'there'

    const body = await request.json().catch(() => ({})) as { note?: string }
    const note = body.note?.trim() || null

    const fmt = (d: string) =>
      new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

    await sendClientUploadReminder({
      to:          clientEmail,
      clientName,
      orgName,
      reconName:   recon.name,
      periodStart: fmt(recon.period_start),
      periodEnd:   fmt(recon.period_end),
      note,
      reconId:     recon.id,
    })

    // Audit log
    const { data: profile } = await supabase
      .from('users').select('name').eq('id', user.id).maybeSingle()
    await admin.from('audit_logs').insert({
      org_id:      mb.org_id,
      entity_type: 'reconciliation',
      entity_id:   id,
      action:      'upload_reminder_sent',
      actor_id:    user.id,
      actor_name:  (profile as { name?: string } | null)?.name ?? null,
      meta:        { recon_name: recon.name, sent_to: clientEmail },
    })

    return NextResponse.json({ ok: true, sent_to: clientEmail })
  } catch (err) {
    console.error('[recon remind]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
