import { createClient } from '@/lib/supabase/server'
import { NextRequest }   from 'next/server'

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: mb } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  if (!mb) return new Response('Forbidden', { status: 403 })

  const { data: recon } = await supabase
    .from('reconciliations')
    .select('id, name, period_start, period_end, status, job_status, job_error, opening_balance, closing_balance, total_matched, total_unmatched, net_difference, total_mismatches, open_mismatches, created_at, completed_at')
    .eq('id', id)
    .eq('org_id', mb.org_id)
    .maybeSingle()
  if (!recon) return new Response('Not found', { status: 404 })

  // Single summary row + one row per mismatch type breakdown
  const { data: typeBreakdown } = await supabase
    .from('recon_mismatches')
    .select('mismatch_type, severity, review_status')
    .eq('reconciliation_id', id)

  const typeCounts: Record<string, number> = {}
  const statusCounts: Record<string, number> = { open: 0, resolved: 0, ignored: 0, escalated: 0 }
  const severityCounts: Record<string, number> = { low: 0, medium: 0, high: 0 }

  for (const m of (typeBreakdown ?? [])) {
    typeCounts[m.mismatch_type] = (typeCounts[m.mismatch_type] ?? 0) + 1
    if (m.review_status in statusCounts)  statusCounts[m.review_status]++
    if (m.severity in severityCounts) severityCounts[m.severity]++
  }

  const summaryRow = {
    id:                  recon.id,
    name:                recon.name,
    period_start:        recon.period_start,
    period_end:          recon.period_end,
    status:              recon.status,
    job_status:          recon.job_status,
    opening_balance:     recon.opening_balance ?? '',
    closing_balance:     recon.closing_balance ?? '',
    net_difference:      recon.net_difference  ?? '',
    total_matched:       recon.total_matched   ?? 0,
    total_unmatched:     recon.total_unmatched ?? 0,
    total_mismatches:    recon.total_mismatches ?? 0,
    open_mismatches:     recon.open_mismatches  ?? 0,
    resolved_mismatches: statusCounts.resolved,
    ignored_mismatches:  statusCounts.ignored,
    escalated_mismatches: statusCounts.escalated,
    severity_high:       severityCounts.high,
    severity_medium:     severityCounts.medium,
    severity_low:        severityCounts.low,
    ...Object.fromEntries(
      Object.entries(typeCounts).map(([k, v]) => [`type_${k}`, v])
    ),
    created_at:          recon.created_at,
    completed_at:        recon.completed_at ?? '',
    exported_at:         new Date().toISOString(),
  }

  const csv = toCSV([summaryRow])
  const filename = `summary_${recon.name.replace(/[^a-z0-9]/gi, '_')}_${dateSuffix()}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

// ─── Helpers ───────────────────────────────────────────────────

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape  = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n')
}

function dateSuffix() {
  return new Date().toISOString().slice(0, 10)
}
