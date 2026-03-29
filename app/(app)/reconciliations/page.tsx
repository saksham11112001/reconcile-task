export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import { StatusBadge, JobStatusBadge } from '@/components/ui/Badge'
import { fmtDate }      from '@/lib/utils/format'
import Link             from 'next/link'
import { Plus, FileUp, ClipboardList, AlertCircle, GitCompare } from 'lucide-react'
import type { Reconciliation, Client } from '@/types'

export default async function ReconciliationsPage() {
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
      .select('id, name, client_id, period_start, period_end, status, job_status, total_mismatches, open_mismatches, total_matched, created_at')
      .eq('org_id', mb.org_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, name, color')
      .eq('org_id', mb.org_id),
  ])

  const list      = (recons  ?? []) as unknown as Reconciliation[]
  const clientMap: Record<string, Pick<Client, 'name' | 'color'>> = {}
  ;(clients ?? []).forEach((c: { id: string; name: string; color: string }) => {
    clientMap[c.id] = { name: c.name, color: c.color }
  })

  return (
    <div className="app-content">
      <Header title="Reconciliations" />
      <div className="page-container">

        {/* Header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '1.5rem', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              All Reconciliations
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {list.length} total
            </p>
          </div>
          <Link href="/reconciliations/new" className="btn btn-brand"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Plus style={{ width: 14, height: 14 }}/> New Reconciliation
          </Link>
        </div>

        {list.length === 0 ? (
          <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <GitCompare style={{ width: 44, height: 44, color: 'var(--border)', margin: '0 auto 1rem' }}/>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
              No reconciliations yet
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 1.25rem' }}>
              Create your first reconciliation to get started.
            </p>
            <Link href="/reconciliations/new" className="btn btn-brand"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Plus style={{ width: 14, height: 14 }}/> New Reconciliation
            </Link>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Client', 'Period', 'Status', 'Files', 'Open Issues', 'Matched', ''].map(h => (
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
                {list.map(r => {
                  const cl          = r.client_id ? clientMap[r.client_id] : null
                  const needsUpload = r.job_status === 'pending' || r.job_status === 'uploaded'
                  const hasFailed   = r.job_status === 'failed'
                  const hasOpen     = (r.open_mismatches ?? 0) > 0

                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.65rem 1rem', maxWidth: 220 }}>
                        <Link href={`/reconciliations/${r.id}`}
                          style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)',
                            textDecoration: 'none', display: 'block',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.name}
                        </Link>
                      </td>
                      <td style={{ padding: '0.65rem 1rem', fontSize: 12.5, color: 'var(--text-muted)',
                        maxWidth: 140 }}>
                        {cl ? (
                          <Link href={`/clients/${r.client_id}`}
                            style={{ display: 'flex', alignItems: 'center', gap: 6,
                              textDecoration: 'none', color: 'var(--text-secondary)' }}>
                            <div style={{ width: 16, height: 16, borderRadius: 4,
                              background: cl.color, flexShrink: 0 }}/>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap' }}>
                              {cl.name}
                            </span>
                          </Link>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', fontSize: 12.5,
                        color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
                      </td>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <StatusBadge status={r.status} />
                      </td>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <JobStatusBadge status={r.job_status} />
                      </td>
                      <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                        {(r.total_mismatches ?? 0) > 0 ? (
                          <span style={{ fontSize: 13, fontWeight: 600,
                            color: hasOpen ? '#b91c1c' : '#15803d' }}>
                            {hasOpen ? r.open_mismatches : '✓'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', fontSize: 13,
                        color: (r.total_matched ?? 0) > 0 ? '#15803d' : 'var(--text-muted)' }}>
                        {(r.total_matched ?? 0) > 0 ? r.total_matched : '—'}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>
                        {hasFailed ? (
                          <Link href={`/reconciliations/${r.id}`}
                            style={{ fontSize: 12.5, color: '#b91c1c', textDecoration: 'none',
                              fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <AlertCircle style={{ width: 12, height: 12 }}/> Fix
                          </Link>
                        ) : needsUpload ? (
                          <Link href={`/reconciliations/${r.id}`}
                            style={{ fontSize: 12.5, color: 'var(--brand)', textDecoration: 'none',
                              fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <FileUp style={{ width: 12, height: 12 }}/> Upload
                          </Link>
                        ) : hasOpen ? (
                          <Link href={`/reconciliations/${r.id}/review`}
                            style={{ fontSize: 12.5, color: '#92400e', textDecoration: 'none',
                              fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <ClipboardList style={{ width: 12, height: 12 }}/> Review
                          </Link>
                        ) : (
                          <Link href={`/reconciliations/${r.id}`}
                            style={{ fontSize: 12.5, color: 'var(--brand)',
                              textDecoration: 'none', fontWeight: 500 }}>
                            Open →
                          </Link>
                        )}
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
