import { NextResponse }           from 'next/server'
import { createClient }           from '@/lib/supabase/api'
import { createAdminClient }      from '@/lib/supabase/admin'
import { sendClientDocRequest }   from '@/lib/email/templates/client-doc-request'

// GET /api/doc-requests?client_id=&recon_id=&status=
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: mb } = await supabase
      .from('org_members').select('org_id')
      .eq('user_id', user.id).eq('is_active', true).maybeSingle()
    if (!mb) return NextResponse.json({ error: 'No org' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const reconId  = searchParams.get('recon_id')
    const status   = searchParams.get('status')

    let q = supabase
      .from('doc_requests')
      .select('*, clients(name), reconciliations(name)')
      .eq('org_id', mb.org_id)
      .order('created_at', { ascending: false })

    if (clientId) q = q.eq('client_id', clientId)
    if (reconId)  q = q.eq('reconciliation_id', reconId)
    if (status)   q = q.eq('status', status)

    const { data, error } = await q
    if (error) throw error

    // Flatten joined names
    const rows = (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      client_name: (r.clients as { name?: string } | null)?.name ?? null,
      recon_name:  (r.reconciliations as { name?: string } | null)?.name ?? null,
      clients:     undefined,
      reconciliations: undefined,
    }))

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('[doc-requests GET]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// POST /api/doc-requests
export async function POST(request: Request) {
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
    const { title, description, client_id, reconciliation_id, due_date } = body
    if (!title?.trim())
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 })

    // Fetch actor name for audit
    const { data: profile } = await supabase
      .from('users').select('name').eq('id', user.id).maybeSingle()

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('doc_requests')
      .insert({
        org_id:            mb.org_id,
        client_id:         client_id         || null,
        reconciliation_id: reconciliation_id || null,
        title:             title.trim(),
        description:       description?.trim() || null,
        due_date:          due_date || null,
        requested_by:      user.id,
        status:            'requested',
      })
      .select()
      .single()

    if (error) throw error

    // Audit log
    await admin.from('audit_logs').insert({
      org_id:      mb.org_id,
      entity_type: 'doc_request',
      entity_id:   data.id,
      action:      'doc_requested',
      actor_id:    user.id,
      actor_name:  (profile as { name?: string } | null)?.name ?? null,
      meta:        { title: data.title, client_id, reconciliation_id },
    })

    // ── Auto-notify client if they have a contact email ──────────
    if (client_id) {
      const [{ data: clientRow }, { data: orgRow }, { data: reconRow }] = await Promise.all([
        admin.from('clients').select('email, contact_person, name').eq('id', client_id).maybeSingle(),
        admin.from('organisations').select('name').eq('id', mb.org_id).maybeSingle(),
        reconciliation_id
          ? admin.from('reconciliations').select('name').eq('id', reconciliation_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      const clientEmail = (clientRow as { email?: string | null } | null)?.email
      if (clientEmail) {
        const orgName     = (orgRow as { name?: string } | null)?.name ?? 'Your CA firm'
        const clientName  = (clientRow as { contact_person?: string | null; name?: string } | null)?.contact_person
                         || (clientRow as { name?: string } | null)?.name
                         || 'there'
        const reconName   = (reconRow as { name?: string } | null)?.name ?? null
        const fmtDue      = data.due_date
          ? new Date(data.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : null
        sendClientDocRequest({
          to:           clientEmail,
          clientName,
          orgName,
          requestTitle: data.title,
          description:  data.description ?? null,
          dueDate:      fmtDue,
          reconName,
          requestId:    data.id,
        }).catch(err => console.error('[doc-request notify client]', err))
      }
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[doc-requests POST]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
