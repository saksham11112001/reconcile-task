export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import { StatusBadge, JobStatusBadge, MismatchTypeBadge, SeverityBadge, ReviewStatusBadge } from '@/components/ui/Badge'
import { fmtDate, fmtDateTime, fmtCurrency } from '@/lib/utils/format'
import Link              from 'next/link'
import { Download, ArrowLeft } from 'lucide-react'
import type { ReactNode, CSSProperties } from 'react'
import type { Reconciliation, ReconMismatch, MismatchType, ReviewStatus, MismatchSeverity } from '@/types'

interface Props { params: Promise<{ id: string }> }

export default async function ReportPage({ params }: Props) {
  const { id }   = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  if (!mb) redirect('/onboarding')

  const { data: recon } = await supabase
    .from('reconciliations')
    .select('*')
    .eq('id', id)
    .eq('org_id', mb.org_id)
    .maybeSingle()
  if (!recon) redirect('/dashboard')

  const { data: mismatchRows } = await supabase
    .from('recon_mismatches')
    .select('id, mismatch_type, severity, review_status, description, detected_at')
    .eq('reconciliation_id', id)
    .order('severity',    { ascending: false })
    .order('detected_at', { ascending: true  })

  const r    = recon as Reconciliation
  const list = (mismatchRows ?? []) as Pick<
    ReconMismatch,
    'id' | 'mismatch_type' | 'severity' | 'review_status' | 'description' | 'detected_at'
  >[]

  // Compute breakdowns in one pass
  const byType:     Record<string, number>               = {}
  const byStatus:   Record<ReviewStatus, number>         = { open: 0, resolved: 0, ignored: 0, escalated: 0 }
  const bySeverity: Record<MismatchSeverity, number>     = { low: 0, medium: 0, high: 0 }

  for (const m of list) {
    byType[m.mismatch_type]  = (byType[m.mismatch_type] ?? 0) + 1
    if (m.review_status in byStatus)   byStatus[m.review_status   as ReviewStatus]++
    if (m.severity      in bySeverity) bySeverity[m.severity      as MismatchSeverity]++
  }

  const typeEntries   = Object.entries(byType).sort((a, b) => b[1] - a[1])
  const hasMismatches = list.length > 0
  const hasBalance    = r.opening_balance != null || r.net_difference != null

  return (
    <div className="app-content">
      <Header title={`Report — ${r.name}`} />
      <div className="page-container" style={{ maxWidth: 780 }}>

        {/* Sub-header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '1.5rem', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href={`/reconciliations/${id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
              <ArrowLeft style={{ width: 14, height: 14 }}/> Workspace
            </Link>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Generated {fmtDateTime(new Date().toISOString())}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <a href={`/api/reconciliations/${id}/export/summary`}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Download style={{ width: 13, height: 13 }}/> Summary CSV
            </a>
            <a href={`/api/reconciliations/${id}/export/mismatches`}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Download style={{ width: 13, height: 13 }}/> Mismatches CSV
            </a>
          </div>
        </div>

        {/* ── Reconciliation info ── */}
        <section className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <SectionTitle>Reconciliation</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 2rem',
            marginTop: '0.75rem' }}>
            <InfoRow label="Name"   value={r.name} />
            <InfoRow label="Period" value={`${fmtDate(r.period_start)} – ${fmtDate(r.period_end)}`} />
            <InfoRow label="Status" value={<StatusBadge status={r.status} />} />
            <InfoRow label="Files"  value={<JobStatusBadge status={r.job_status} />} />
            {r.opening_balance != null && (
              <InfoRow label="Opening Balance" value={fmtCurrency(r.opening_balance)} />
            )}
            {r.closing_balance != null && (
              <InfoRow label="Closing Balance" value={fmtCurrency(r.closing_balance)} />
            )}
            {r.net_difference != null && (
              <InfoRow
                label="Net Difference"
                value={
                  <span style={{ color: r.net_difference === 0 ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
                    {fmtCurrency(r.net_difference)}
                  </span>
                }
              />
            )}
            {r.total_matched != null && (
              <InfoRow label="Matched Entries"   value={String(r.total_matched)} />
            )}
            {r.total_unmatched != null && (
              <InfoRow label="Unmatched Entries" value={String(r.total_unmatched)} />
            )}
          </div>
        </section>

        {/* ── Mismatch summary ── */}
        {hasMismatches ? (
          <>
            <section className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
              <SectionTitle>Mismatch Summary</SectionTitle>

              {/* By review status */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem',
                marginTop: '0.75rem', marginBottom: '1.25rem' }}>
                {([
                  { key: 'open',      label: 'Open',      color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
                  { key: 'resolved',  label: 'Resolved',  color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
                  { key: 'escalated', label: 'Escalated', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
                  { key: 'ignored',   label: 'Ignored',   color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
                ] as const).map(({ key, label, color, bg, border }) => (
                  <div key={key} style={{ padding: '0.85rem 1rem', borderRadius: 8,
                    background: bg, border: `1px solid ${border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>
                      {byStatus[key]}
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 500, color, opacity: 0.75,
                      marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              {/* By severity */}
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                By Severity
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {([
                  { key: 'high',   label: 'High',   color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
                  { key: 'medium', label: 'Medium', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
                  { key: 'low',    label: 'Low',    color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
                ] as const).map(({ key, label, color, bg, border }) => (
                  <div key={key} style={{ padding: '0.6rem 1rem', borderRadius: 7,
                    background: bg, border: `1px solid ${border}`,
                    display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color }}>{bySeverity[key]}</span>
                    <span style={{ fontSize: 12, color, opacity: 0.75 }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* By type */}
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                By Type
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {typeEntries.map(([type, count]) => (
                    <tr key={type} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.5rem 0' }}>
                        <MismatchTypeBadge type={type as MismatchType} />
                      </td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right',
                        fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', width: 36 }}>
                        {count}
                      </td>
                      <td style={{ padding: '0.5rem 0 0.5rem 1rem', width: 180 }}>
                        <BarFill pct={Math.round((count / list.length) * 100)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* ── Mismatch item list (first 50, download for full) ── */}
            <section className="card" style={{ overflow: 'hidden', marginBottom: '1.25rem' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <SectionTitle style={{ margin: 0 }}>Mismatch Items</SectionTitle>
                {list.length > 50 && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Showing first 50 of {list.length} — download CSV for full list
                  </span>
                )}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-subtle)',
                    borderBottom: '1px solid var(--border)' }}>
                    {['Type', 'Severity', 'Status', 'Description', 'Detected'].map(h => (
                      <th key={h} style={{ padding: '0.55rem 1rem', textAlign: 'left',
                        fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.slice(0, 50).map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.6rem 1rem', whiteSpace: 'nowrap' }}>
                        <MismatchTypeBadge type={m.mismatch_type} />
                      </td>
                      <td style={{ padding: '0.6rem 1rem', whiteSpace: 'nowrap' }}>
                        <SeverityBadge severity={m.severity} />
                      </td>
                      <td style={{ padding: '0.6rem 1rem', whiteSpace: 'nowrap' }}>
                        <ReviewStatusBadge status={m.review_status} />
                      </td>
                      <td style={{ padding: '0.6rem 1rem', fontSize: 13,
                        color: 'var(--text-secondary)', maxWidth: 260 }}>
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {m.description || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 1rem', fontSize: 12,
                        color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {fmtDate(m.detected_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        ) : (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center',
            marginBottom: '1.25rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
              No mismatches detected for this reconciliation.
            </p>
          </div>
        )}

        {/* Export footer */}
        <div style={{ padding: '1rem 1.25rem', borderRadius: 8,
          background: 'var(--surface-subtle)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Download full data for record-keeping or external review.
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={`/api/reconciliations/${id}/export/summary`}
              className="btn btn-ghost btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Download style={{ width: 12, height: 12 }}/> Summary CSV
            </a>
            <a href={`/api/reconciliations/${id}/export/mismatches`}
              className="btn btn-ghost btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Download style={{ width: 12, height: 12 }}/> Mismatches CSV
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────

function SectionTitle({ children, style }: {
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.06em', ...style }}>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12.5, color: 'var(--text-muted)',
        minWidth: 140, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 500 }}>
        {value}
      </span>
    </div>
  )
}

function BarFill({ pct }: { pct: number }) {
  return (
    <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.max(pct, 4)}%`, borderRadius: 3,
        background: 'var(--brand)' }} />
    </div>
  )
}
