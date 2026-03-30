'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Users2, Building2, Mail, Phone, Search, Heart, AlertTriangle, ShieldAlert } from 'lucide-react'
import { fmtDate } from '@/lib/utils/format'
import type { Client, ClientStatus, ClientHealth } from '@/types'

// ─── Types ───────────────────────────────────────────────────────

interface ClientWithStats extends Client {
  open_mismatches: number
  last_period_end: string | null
  last_job_status: string | null
}

interface Props {
  clients:   ClientWithStats[]
  canManage: boolean
}

// ─── Status + health config ───────────────────────────────────────

const STATUS_STYLE: Record<ClientStatus, { bg: string; color: string; label: string }> = {
  active:   { bg: '#f0fdf4', color: '#15803d', label: 'Active'   },
  prospect: { bg: '#fffbeb', color: '#92400e', label: 'Prospect' },
  inactive: { bg: '#f1f5f9', color: '#64748b', label: 'Inactive' },
}

const HEALTH_CFG: Record<ClientHealth, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  healthy:      { label: 'Healthy',      color: '#15803d', bg: '#f0fdf4', Icon: Heart         },
  needs_review: { label: 'Needs Review', color: '#92400e', bg: '#fffbeb', Icon: AlertTriangle  },
  at_risk:      { label: 'At Risk',      color: '#b91c1c', bg: '#fef2f2', Icon: ShieldAlert    },
}

// ─── Health computation ───────────────────────────────────────────

function computeHealth(c: ClientWithStats): ClientHealth {
  if (c.open_mismatches >= 5 || c.last_job_status === 'failed') return 'at_risk'
  if (c.open_mismatches > 0)  return 'needs_review'
  return 'healthy'
}

// ─── Component ───────────────────────────────────────────────────

export function ClientsView({ clients, canManage }: Props) {
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all')
  const [healthFilter, setHealthFilter] = useState<ClientHealth | 'all'>('all')

  const enhanced = useMemo(() =>
    clients.map(c => ({ ...c, health: computeHealth(c) })),
    [clients]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return enhanced.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (healthFilter !== 'all' && c.health !== healthFilter) return false
      if (q && !c.name.toLowerCase().includes(q) &&
          !(c.gstin?.toLowerCase().includes(q)) &&
          !(c.contact_person?.toLowerCase().includes(q)) &&
          !(c.industry?.toLowerCase().includes(q))) return false
      return true
    })
  }, [enhanced, statusFilter, healthFilter, search])

  const active   = clients.filter(c => c.status === 'active').length
  const prospect = clients.filter(c => c.status === 'prospect').length
  const inactive = clients.filter(c => c.status === 'inactive').length

  return (
    <div className="page-container">

      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1.25rem', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            All Clients
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            {active} active · {prospect} prospect · {inactive} inactive
          </p>
        </div>
        {canManage && (
          <Link href="/clients/new" className="btn btn-brand"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus style={{ width: 15, height: 15 }}/> New Client
          </Link>
        )}
      </div>

      {/* Filters */}
      {clients.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160, maxWidth: 300 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              width: 14, height: 14, color: 'var(--text-muted)', pointerEvents: 'none' }}/>
            <input
              type="text"
              className="input"
              placeholder="Search clients…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2rem', fontSize: 13 }}
            />
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['all','active','prospect','inactive'] as const).map(s => (
              <button key={s}
                onClick={() => setStatusFilter(s)}
                style={{ padding: '0.35rem 0.7rem', fontSize: 12.5, borderRadius: 6, cursor: 'pointer',
                  border: '1px solid',
                  borderColor: statusFilter === s ? 'var(--brand-border)' : 'var(--border)',
                  background: statusFilter === s ? 'var(--brand-light)' : 'transparent',
                  color: statusFilter === s ? 'var(--brand)' : 'var(--text-secondary)',
                  fontWeight: statusFilter === s ? 600 : 400 }}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Health filter */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['all','healthy','needs_review','at_risk'] as const).map(h => {
              const cfg = h !== 'all' ? HEALTH_CFG[h] : null
              return (
                <button key={h}
                  onClick={() => setHealthFilter(h)}
                  style={{ padding: '0.35rem 0.7rem', fontSize: 12.5, borderRadius: 6, cursor: 'pointer',
                    border: '1px solid',
                    borderColor: healthFilter === h ? (cfg?.color ?? 'var(--brand-border)') : 'var(--border)',
                    background: healthFilter === h ? (cfg?.bg ?? 'var(--brand-light)') : 'transparent',
                    color: healthFilter === h ? (cfg?.color ?? 'var(--brand)') : 'var(--text-secondary)',
                    fontWeight: healthFilter === h ? 600 : 400 }}>
                  {h === 'all' ? 'All health' : HEALTH_CFG[h].label}
                </button>
              )
            })}
          </div>

          {(search || statusFilter !== 'all' || healthFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('all'); setHealthFilter('all') }}
              style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none',
                border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {clients.length === 0 ? (
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
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 2rem',
          color: 'var(--text-muted)', fontSize: 14 }}>
          No clients match your filters.{' '}
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setHealthFilter('all') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--brand)', fontWeight: 500, fontSize: 14 }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filtered.map(c => {
            const st     = STATUS_STYLE[c.status] ?? STATUS_STYLE.inactive
            const health = HEALTH_CFG[c.health]
            const HealthIcon = health.Icon

            return (
              <Link key={c.id} href={`/clients/${c.id}`}
                style={{ textDecoration: 'none', display: 'block' }}>
                <div className="card-elevated" style={{ padding: '1.1rem 1.25rem', cursor: 'pointer' }}>

                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: '0.75rem' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: c.color,
                      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: 17 }}>
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
                          {c.gstin}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact row */}
                  {(c.contact_person || c.email || c.phone) && (
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
                  )}

                  {/* Stats + health */}
                  <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.65rem',
                    borderTop: '1px solid var(--border-light)', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                        Open Issues
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700,
                        color: c.open_mismatches > 0 ? '#b91c1c' : '#15803d' }}>
                        {c.open_mismatches}
                      </div>
                    </div>
                    {c.last_period_end && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)',
                          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                          Last Period
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                          {fmtDate(c.last_period_end)}
                        </div>
                      </div>
                    )}
                    <div style={{ marginLeft: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 20,
                        background: health.bg, color: health.color,
                        fontSize: 11.5, fontWeight: 600 }}>
                        <HealthIcon style={{ width: 10, height: 10 }}/>
                        {health.label}
                      </div>
                    </div>
                  </div>

                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
