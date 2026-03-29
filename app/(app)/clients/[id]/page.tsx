export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import { StatusBadge, JobStatusBadge } from '@/components/ui/Badge'
import { fmtDate }      from '@/lib/utils/format'
import Link             from 'next/link'
import { ArrowLeft, Pencil, Mail, Phone, Building2, GitCompare, AlertCircle } from 'lucide-react'
import type { Client, Reconciliation, OrgRole } from '@/types'

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: '#f0fdf4', color: '#15803d', label: 'Active'   },
  prospect: { bg: '#fffbeb', color: '#92400e', label: 'Prospect' },
  inactive: { bg: '#f1f5f9', color: '#64748b', label: 'Inactive' },
}

const CAN_MANAGE: OrgRole[] = ['owner', 'admin', 'reviewer']

interface Props { params: Promise<{ id: string }> }

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members').select('org_id, role')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb) redirect('/onboarding')

  const { data: client } = await supabase
    .from('clients').select('*')
    .eq('id', id).eq('org_id', mb.org_id).maybeSingle()
  if (!client) redirect('/clients')

  const { data: recons } = await supabase
    .from('reconciliations')
    .select('id, name, period_start, period_end, status, job_status, open_mismatches, total_mismatches, created_at')
    .eq('org_id', mb.org_id)
    .eq('client_id', id)
    .order('period_end', { ascending: false })
    .limit(20)

  const c         = client as Client
  const reconList = (recons ?? []) as Reconciliation[]
  const st        = STATUS_STYLE[c.status] ?? STATUS_STYLE.inactive
  const canManage = CAN_MANAGE.includes(mb.role as OrgRole)

  // Aggregate stats
  const totalRecons    = reconList.length
  const openMismatches = reconList.reduce((s, r) => s + (r.open_mismatches ?? 0), 0)
  const totalMismatches = reconList.reduce((s, r) => s + (r.total_mismatches ?? 0), 0)
  const completedRecons = reconList.filter(r => r.status === 'completed').length

  return (
    <div className="app-content">
      <Header title={c.name} />
      <div className="page-container" style={{ maxWidth: 860 }}>

        {/* Breadcrumb + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '1.25rem', flexWrap: 'wrap', gap: 10 }}>
          <Link href="/clients"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
            <ArrowLeft style={{ width: 14, height: 14 }}/> All Clients
          </Link>
          {canManage && (
            <Link href={`/clients/${c.id}/edit`} className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Pencil style={{ width: 13, height: 13 }}/> Edit
            </Link>
          )}
        </div>

        {/* Client card */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: '1.25rem' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: c.color, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 22,
            }}>
              {c.name[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {c.name}
                </h1>
                <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 8px',
                  borderRadius: 6, background: st.bg, color: st.color }}>
                  {st.label}
                </span>
              </div>
              {c.industry && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{c.industry}</p>
              )}
              {c.gstin && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  GSTIN: {c.gstin}
                </p>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem',
            padding: '1rem 0', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)',
            marginBottom: '1.25rem', textAlign: 'center' }}>
            {[
              { label: 'Reconciliations', value: totalRecons,     color: 'var(--brand)' },
              { label: 'Completed',       value: completedRecons, color: '#15803d' },
              { label: 'Open Mismatches', value: openMismatches,  color: openMismatches > 0 ? '#b91c1c' : '#15803d' },
              { label: 'Total Mismatches',value: totalMismatches, color: 'var(--text-primary)' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3,
                  textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Contact info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 2rem' }}>
            {c.contact_person && (
              <InfoRow icon={Building2} label="Contact" value={c.contact_person} />
            )}
            {c.email && (
              <InfoRow icon={Mail} label="Email" value={c.email} href={`mailto:${c.email}`} />
            )}
            {c.phone && (
              <InfoRow icon={Phone} label="Phone" value={c.phone} href={`tel:${c.phone}`} />
            )}
            {c.company && (
              <InfoRow icon={Building2} label="Company" value={c.company} />
            )}
          </div>

          {c.notes && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Notes</div>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6,
                whiteSpace: 'pre-wrap' }}>
                {c.notes}
              </p>
            </div>
          )}
        </div>

        {/* Reconciliations list */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Reconciliations ({totalRecons})
          </h2>
          {canManage && (
            <Link href={`/reconciliations/new?client=${c.id}`} className="btn btn-brand btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <GitCompare style={{ width: 13, height: 13 }}/> New Reconciliation
            </Link>
          )}
        </div>

        {reconList.length === 0 ? (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <AlertCircle style={{ width: 32, height: 32, color: 'var(--border)', margin: '0 auto 0.75rem' }}/>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              No reconciliations linked to this client yet.
            </p>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Period', 'Status', 'Files', 'Open Issues', ''].map(h => (
                    <th key={h} style={{ padding: '0.55rem 1rem', textAlign: 'left',
                      fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reconList.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.65rem 1rem', fontSize: 13.5,
                      fontWeight: 500, color: 'var(--text-primary)' }}>
                      {r.name}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontSize: 12.5, color: 'var(--text-muted)',
                      whiteSpace: 'nowrap' }}>
                      {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>
                      <JobStatusBadge status={r.job_status} />
                    </td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                      {(r.open_mismatches ?? 0) > 0 ? (
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>
                          {r.open_mismatches}
                        </span>
                      ) : (
                        <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <Link href={`/reconciliations/${r.id}`}
                        style={{ fontSize: 12.5, fontWeight: 600,
                          color: 'var(--brand)', textDecoration: 'none' }}>
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value, href }: {
  icon: React.ElementType
  label: string
  value: string
  href?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <Icon style={{ width: 14, height: 14, color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }}/>
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>
          {label}
        </div>
        {href ? (
          <a href={href} style={{ fontSize: 13.5, color: 'var(--brand)', textDecoration: 'none' }}>
            {value}
          </a>
        ) : (
          <div style={{ fontSize: 13.5, color: 'var(--text-primary)' }}>{value}</div>
        )}
      </div>
    </div>
  )
}
