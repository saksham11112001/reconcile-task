import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/api'

interface Ctx { params: Promise<{ id: string }> }

async function getMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  reconId: string,
) {
  const { data: mb } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  if (!mb) return { mb: null, recon: null }

  const { data: recon } = await supabase
    .from('reconciliations')
    .select('id, org_id, job_status, status')
    .eq('id', reconId)
    .eq('org_id', mb.org_id)
    .maybeSingle()

  return { mb, recon }
}

// ─── GET /api/reconciliations/[id]/mismatches ─────────────────
//
// Query params (all optional):
//   ?status=open|resolved|ignored|escalated   filter by review_status
//   ?type=amount_mismatch|missing_in_bank|…   filter by mismatch_type
//   ?severity=low|medium|high                 filter by severity
//   ?limit=50                                 default 100, max 200
//   ?offset=0

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { mb, recon } = await getMember(supabase, user.id, id)
    if (!mb)    return NextResponse.json({ error: 'No org' },    { status: 403 })
    if (!recon) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const url    = new URL(request.url)
    const status   = url.searchParams.get('status')
    const type     = url.searchParams.get('type')
    const severity = url.searchParams.get('severity')
    const limit    = Math.min(parseInt(url.searchParams.get('limit')  ?? '100'), 200)
    const offset   = parseInt(url.searchParams.get('offset') ?? '0')

    let query = supabase
      .from('recon_mismatches')
      .select(`
        id,
        mismatch_type,
        review_status,
        severity,
        description,
        diff_data,
        bank_entry_id,
        book_entry_id,
        detected_at,
        created_at
      `)
      .eq('reconciliation_id', id)
      .order('severity',    { ascending: false })   // high first
      .order('detected_at', { ascending: true  })
      .range(offset, offset + limit - 1)

    const validStatuses  = ['open','resolved','ignored','escalated']
    const validTypes     = ['missing_in_bank','missing_in_ledger','amount_mismatch',
                            'date_mismatch','duplicate','tax_mismatch','gstin_mismatch']
    const validSeverities = ['low','medium','high']

    if (status   && validStatuses.includes(status))     query = query.eq('review_status',  status)
    if (type     && validTypes.includes(type))          query = query.eq('mismatch_type',   type)
    if (severity && validSeverities.includes(severity)) query = query.eq('severity',        severity)

    const { data, error, count } = await query

    if (error) throw error

    // Return data + summary counts
    const { data: counts } = await supabase
      .from('recon_mismatches')
      .select('review_status')
      .eq('reconciliation_id', id)

    const summary = { open: 0, resolved: 0, ignored: 0, escalated: 0, total: 0 }
    for (const row of (counts ?? [])) {
      summary.total++
      if (row.review_status in summary) {
        summary[row.review_status as keyof typeof summary]++
      }
    }

    return NextResponse.json({ mismatches: data ?? [], summary, count: data?.length ?? 0 })
  } catch (err) {
    console.error('[mismatches GET]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
