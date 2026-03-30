export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import Link             from 'next/link'
import { fmtDate }      from '@/lib/utils/format'
import { StatusBadge }  from '@/components/ui/Badge'
import { FileBarChart2, ExternalLink } from 'lucide-react'
import type { Reconciliation, Client } from '@/types'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members').select('org_id, role')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb) redirect('/onboarding')

  const [{ data: recons }, { data: clients }] = await Promise.all([
    supabase
      .from('reconciliations')
      .select('id, name, client_id, period_start, period_end, status, job_status, total_matched, total_unmatched, total_mismatches, open_mismatches, net_difference, created_at')
      .eq('org_id', mb.org_id)
      .in('job_status', ['ready', 'processing'])
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, name, color')
      .eq('org_id', mb.org_id),
  ])

  const list = (recons ?? []) as unknown as Reconciliation[]
  const clientMap: Record<string, { name: string; color: string }> = {}
  ;(clients ?? []).forEach((c: { id: string; name: string; color: string }) => {
    clientMap[c.id] = { name: c.name, color: c.color }
  })

  return (
    <div className="app-content">
      <Header title="Reports" />
      <div className="page-container">

        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            Reconciliation Reports
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            View and export detailed reports for each reconciliation.
          </p>
        </div>

        {list.length === 0 ? (
          <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <FileBarChart2 style={{ width: 44, height: 44, color: 'var(--border)', margin: '0 auto 1rem' }}/>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
              No reports available yet
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Reports are generated once reconciliations finish processing.
            </p>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
                  {['Reconciliation', 'Client', 'Period', 'Status', 'Matched', 'Open Issues', 'Difference', 'Report'].map(h => (
                    <th key={h} style={{ padding: '0.55rem 1rem', textAlign: 'left',
                      fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map(r => {
                  const cl      = r.client_id ? clientMap[r.client_id] : null
                  const hasOpen = (r.open_mismatches ?? 0) > 0
                  const diff    = r.net_difference ?? 0

                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.65rem 1rem', maxWidth: 200 }}>
                        <Link href={`/reconciliations/${r.id}`}
                          style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)',
                            textDecoration: 'none', display: 'block',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.name}
                        </Link>
                      </td>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        {cl ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: cl.color }}/>
                            <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{cl.name}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', fontSize: 12.5,
                        color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
                      </td>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <StatusBadge status={r.status} />
                      </td>
                      <td style={{ padding: '0.65rem 1rem', fontSize: 13,
                        color: (r.total_matched ?? 0) > 0 ? '#15803d' : 'var(--text-muted)' }}>
                        {(r.total_matched ?? 0) > 0 ? r.total_matched?.toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', fontSize: 13,
                        color: hasOpen ? '#b91c1c' : '#15803d', fontWeight: hasOpen ? 600 : 400 }}>
                        {(r.total_mismatches ?? 0) > 0
                          ? (hasOpen ? `${r.open_mismatches} open` : '✓ All reviewed')
                          : '—'}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', fontSize: 13,
                        color: diff !== 0 ? '#b91c1c' : '#15803d', fontWeight: 500,
                        whiteSpace: 'nowrap' }}>
                        {diff !== 0
                          ? `₹${Math.abs(diff).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                          : '✓ Balanced'}
                      </td>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <Link href={`/reconciliations/${r.id}/report`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 12.5, color: 'var(--brand)', textDecoration: 'none',
                            fontWeight: 600 }}>
                          <ExternalLink style={{ width: 12, height: 12 }}/> View Report
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
