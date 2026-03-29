export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import Link             from 'next/link'
import { Plus, Users2, Building2, Mail, Phone } from 'lucide-react'
import { fmtDate }      from '@/lib/utils/format'
import type { Client, OrgRole } from '@/types'

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: '#f0fdf4', color: '#15803d', label: 'Active'   },
  prospect: { bg: '#fffbeb', color: '#92400e', label: 'Prospect' },
  inactive: { bg: '#f1f5f9', color: '#64748b', label: 'Inactive' },
}

const CAN_MANAGE: OrgRole[] = ['owner', 'admin', 'reviewer']

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members').select('org_id, role')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb) redirect('/onboarding')

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, gstin, contact_person, email, phone, status, color, industry, created_at, updated_at')
    .eq('org_id', mb.org_id)
    .order('name')

  // Fetch open mismatches + last recon per client in one query
  const { data: reconStats } = await supabase
    .from('reconciliations')
    .select('client_id, open_mismatches, period_end, job_status')
    .eq('org_id', mb.org_id)
    .order('period_end', { ascending: false })

  // Build per-client summary maps
  const openMismatchMap: Record<string, number>  = {}
  const lastPeriodMap:   Record<string, string>  = {}
  const lastJobMap:      Record<string, string>  = {}
  const seenClient       = new Set<string>()

  for (const r of reconStats ?? []) {
    if (!r.client_id) continue
    openMismatchMap[r.client_id] = (openMismatchMap[r.client_id] ?? 0) + (r.open_mismatches ?? 0)
    if (!seenClient.has(r.client_id)) {
      seenClient.add(r.client_id)
      lastPeriodMap[r.client_id] = r.period_end
      lastJobMap[r.client_id]    = r.job_status
    }
  }

  const list     = (clients ?? []) as Client[]
  const canManage = CAN_MANAGE.includes(mb.role as OrgRole)

  const active   = list.filter(c => c.status === 'active')
  const prospect = list.filter(c => c.status === 'prospect')
  const inactive = list.filter(c => c.status === 'inactive')

  return (
    <div className="app-content">
      <Header title="Clients" />
      <div className="page-container">

        {/* Header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '1.5rem', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              All Clients
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {active.length} active · {prospect.length} prospect · {inactive.length} inactive
            </p>
          </div>
          {canManage && (
            <Link href="/clients/new" className="btn btn-brand"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus style={{ width: 15, height: 15 }}/> New Client
            </Link>
          )}
        </div>

        {list.length === 0 ? (
          <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Users2 style={{ width: 44, height: 44, color: 'var(--border)', margin: '0 auto 1rem' }}/>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
              No clients yet
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 1.25rem' }}>
              Add your first client to link reconciliations to them.
            </p>
            {canManage && (
              <Link href="/clients/new" className="btn btn-brand">Add Client</Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {list.map(c => {
              const st   = STATUS_STYLE[c.status] ?? STATUS_STYLE.inactive
              const open = openMismatchMap[c.id] ?? 0
              const last = lastPeriodMap[c.id]

              return (
                <Link key={c.id} href={`/clients/${c.id}`}
                  style={{ textDecoration: 'none', display: 'block' }}>
                  <div className="card" style={{
                    padding: '1.1rem 1.25rem',
                    transition: 'box-shadow 0.15s, border-color 0.15s',
                    cursor: 'pointer',
                  }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = ''
                    }}>

                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: '0.75rem' }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 10,
                        background: c.color, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 17,
                      }}>
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.name}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px',
                            borderRadius: 6, background: st.bg, color: st.color, flexShrink: 0 }}>
                            {st.label}
                          </span>
                        </div>
                        {c.industry && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.industry}</div>
                        )}
                        {c.gstin && (
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            GSTIN: {c.gstin}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contact row */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                      {c.contact_person && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 12, color: 'var(--text-secondary)' }}>
                          <Building2 style={{ width: 11, height: 11 }}/> {c.contact_person}
                        </span>
                      )}
                      {c.email && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 12, color: 'var(--text-secondary)' }}>
                          <Mail style={{ width: 11, height: 11 }}/> {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 12, color: 'var(--text-secondary)' }}>
                          <Phone style={{ width: 11, height: 11 }}/> {c.phone}
                        </span>
                      )}
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.65rem',
                      borderTop: '1px solid var(--border-light)' }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)',
                          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                          Open Mismatches
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700,
                          color: open > 0 ? '#b91c1c' : '#15803d' }}>
                          {open}
                        </div>
                      </div>
                      {last && (
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)',
                            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                            Last Period
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                            {fmtDate(last)}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
