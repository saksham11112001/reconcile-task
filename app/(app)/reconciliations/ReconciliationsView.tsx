'use client'

import { useState }  from 'react'
import { useRouter } from 'next/navigation'
import Link          from 'next/link'
import { StatusBadge, JobStatusBadge } from '@/components/ui/Badge'
import { fmtDate }   from '@/lib/utils/format'
import { NewReconciliationModal } from '@/components/reconciliation/NewReconciliationModal'
import { InlineReconRow }         from '@/components/reconciliation/InlineReconRow'
import {
  FileUp, ClipboardList, AlertCircle, GitCompare,
  Pencil, Layers,
} from 'lucide-react'
import type { Reconciliation, Client } from '@/types'

interface Props {
  list:          Reconciliation[]
  clients:       Pick<Client, 'id' | 'name' | 'color'>[]
  currentUserId: string
  myMode?:       boolean
}

const COL_COUNT = 9   // Name Client Period Status Files OpenIssues Matched Edit Action

export function ReconciliationsView({ list: initial, clients, currentUserId, myMode = false }: Props) {
  const router = useRouter()

  // ── local list for optimistic add / edit ────────────────────
  const [localList,    setLocalList]    = useState<Reconciliation[]>(initial)
  const [showModal,    setShowModal]    = useState(false)
  const [clientFilter, setClientFilter] = useState('')
  const [mine,         setMine]         = useState(myMode)
  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [inlineMode,   setInlineMode]   = useState(false)   // show inline add vs modal

  const clientMap: Record<string, Pick<Client, 'name' | 'color'>> = {}
  clients.forEach(c => { clientMap[c.id] = { name: c.name, color: c.color } })

  const filtered = localList.filter(r => {
    if (clientFilter && r.client_id !== clientFilter) return false
    if (mine && r.assignee_id !== currentUserId && r.created_by !== currentUserId) return false
    return true
  })

  // ── Optimistic add ───────────────────────────────────────────
  function handleCreated(r: Reconciliation) {
    setLocalList(prev => [r, ...prev])
    router.refresh()
  }

  // ── Optimistic edit ──────────────────────────────────────────
  function handleSaved(updated: Reconciliation) {
    setLocalList(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))
    setEditingId(null)
    router.refresh()
  }

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: '1.25rem', flexWrap: 'wrap' }}>

        {/* All / Mine toggle */}
        <div style={{ display: 'flex', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {(['all', 'mine'] as const).map(v => (
            <button key={v} onClick={() => setMine(v === 'mine')}
              style={{ padding: '5px 14px', fontSize: 12.5, fontWeight: 500, border: 'none',
                cursor: 'pointer', transition: 'background 0.1s',
                background: (v === 'mine') === mine ? 'var(--brand)' : 'var(--surface)',
                color:      (v === 'mine') === mine ? '#fff' : 'var(--text-secondary)' }}>
              {v === 'all' ? 'All' : 'Mine'}
            </button>
          ))}
        </div>

        {/* Client filter */}
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
          className="input" style={{ fontSize: 13, padding: '5px 10px', maxWidth: 200, flex: '0 0 auto' }}>
          <option value="">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {(clientFilter || mine) && (
          <button onClick={() => { setClientFilter(''); setMine(false) }}
            className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
            Clear filters
          </button>
        )}

        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {filtered.length} reconciliation{filtered.length !== 1 ? 's' : ''}
        </span>

        {/* Inline / Modal toggle */}
        <div style={{ display: 'flex', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <button onClick={() => setInlineMode(false)}
            title="Open as dialog"
            style={{ padding: '5px 10px', border: 'none', cursor: 'pointer',
              background: !inlineMode ? 'var(--surface-subtle)' : 'var(--surface)',
              color: !inlineMode ? 'var(--text-primary)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <Layers style={{ width: 13, height: 13 }}/> Modal
          </button>
          <button onClick={() => setInlineMode(true)}
            title="Add inline in table"
            style={{ padding: '5px 10px', border: 'none', cursor: 'pointer',
              background: inlineMode ? 'var(--surface-subtle)' : 'var(--surface)',
              color: inlineMode ? 'var(--text-primary)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <Pencil style={{ width: 13, height: 13 }}/> Inline
          </button>
        </div>

        {!inlineMode && (
          <button onClick={() => setShowModal(true)} className="btn btn-brand"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
            + New Reconciliation
          </button>
        )}
      </div>

      {/* ── Table (always shown when inline mode; also shows empty state) ── */}
      {filtered.length === 0 && !inlineMode ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <GitCompare style={{ width: 44, height: 44, color: 'var(--border)', margin: '0 auto 1rem' }}/>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            {mine ? 'No reconciliations assigned to you' : 'No reconciliations found'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 1.25rem' }}>
            {mine ? 'Reconciliations assigned to you will appear here.' : 'Create your first reconciliation to get started.'}
          </p>
          {!mine && (
            <button onClick={() => setShowModal(true)} className="btn btn-brand"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              + New Reconciliation
            </button>
          )}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
                {['Name','Client','Period','Status','Files','Open Issues','Matched','',''].map((h,i) => (
                  <th key={i} style={{ padding: '0.55rem 1rem', textAlign: 'left',
                    fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                // ── Edit mode for this row ──────────────────
                if (editingId === r.id) {
                  return (
                    <InlineReconRow
                      key={r.id}
                      mode="edit"
                      recon={r}
                      clients={clients}
                      colSpan={COL_COUNT}
                      onSaved={handleSaved}
                      onCancel={() => setEditingId(null)}
                    />
                  )
                }

                // ── Normal display row ──────────────────────
                const cl          = r.client_id ? clientMap[r.client_id] : null
                const needsUpload = r.job_status === 'pending' || r.job_status === 'uploaded'
                const hasFailed   = r.job_status === 'failed'
                const hasOpen     = (r.open_mismatches ?? 0) > 0

                return (
                  <tr key={r.id}
                    style={{ borderBottom: '1px solid var(--border-light)' }}
                    className="recon-row">

                    {/* Name */}
                    <td style={{ padding: '0.65rem 1rem', maxWidth: 220 }}>
                      <Link href={`/reconciliations/${r.id}`}
                        style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)',
                          textDecoration: 'none', display: 'block',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.name}
                      </Link>
                    </td>

                    {/* Client */}
                    <td style={{ padding: '0.65rem 1rem', fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 140 }}>
                      {cl ? (
                        <Link href={`/clients/${r.client_id}`}
                          style={{ display: 'flex', alignItems: 'center', gap: 6,
                            textDecoration: 'none', color: 'var(--text-secondary)' }}>
                          <div style={{ width: 14, height: 14, borderRadius: 3, background: cl.color, flexShrink: 0 }}/>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cl.name}
                          </span>
                        </Link>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>

                    {/* Period */}
                    <td style={{ padding: '0.65rem 1rem', fontSize: 12.5,
                      color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <StatusBadge status={r.status} />
                    </td>

                    {/* Files */}
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <JobStatusBadge status={r.job_status} />
                    </td>

                    {/* Open issues */}
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                      {(r.total_mismatches ?? 0) > 0 ? (
                        <span style={{ fontSize: 13, fontWeight: 600, color: hasOpen ? '#b91c1c' : '#15803d' }}>
                          {hasOpen ? r.open_mismatches : '✓'}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    {/* Matched */}
                    <td style={{ padding: '0.65rem 1rem', fontSize: 13,
                      color: (r.total_matched ?? 0) > 0 ? '#15803d' : 'var(--text-muted)' }}>
                      {(r.total_matched ?? 0) > 0 ? r.total_matched : '—'}
                    </td>

                    {/* Edit button */}
                    <td style={{ padding: '0.65rem 0.5rem' }}>
                      <button
                        onClick={() => setEditingId(r.id)}
                        title="Edit reconciliation"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 26, height: 26, borderRadius: 6, border: 'none',
                          background: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                          opacity: 0.6, transition: 'opacity 0.12s, color 0.12s' }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--brand)' }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                        <Pencil style={{ width: 13, height: 13 }}/>
                      </button>
                    </td>

                    {/* Action */}
                    <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>
                      {hasFailed ? (
                        <Link href={`/reconciliations/${r.id}`}
                          style={{ fontSize: 12.5, color: '#b91c1c', textDecoration: 'none', fontWeight: 500,
                            display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <AlertCircle style={{ width: 12, height: 12 }}/> Fix
                        </Link>
                      ) : needsUpload ? (
                        <Link href={`/reconciliations/${r.id}`}
                          style={{ fontSize: 12.5, color: 'var(--brand)', textDecoration: 'none', fontWeight: 500,
                            display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <FileUp style={{ width: 12, height: 12 }}/> Upload
                        </Link>
                      ) : hasOpen ? (
                        <Link href={`/reconciliations/${r.id}/review`}
                          style={{ fontSize: 12.5, color: '#92400e', textDecoration: 'none', fontWeight: 600,
                            display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <ClipboardList style={{ width: 12, height: 12 }}/> Review
                        </Link>
                      ) : (
                        <Link href={`/reconciliations/${r.id}`}
                          style={{ fontSize: 12.5, color: 'var(--brand)', textDecoration: 'none', fontWeight: 500 }}>
                          Open →
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}

              {/* ── Inline add row at bottom of table ── */}
              {inlineMode && (
                <InlineReconRow
                  mode="add"
                  clients={clients}
                  colSpan={COL_COUNT}
                  onCreated={handleCreated}
                />
              )}

              {/* ── Empty state inside table when inline mode ── */}
              {inlineMode && filtered.length === 0 && (
                <tr>
                  <td colSpan={COL_COUNT}
                    style={{ padding: '2.5rem 1rem', textAlign: 'center',
                      color: 'var(--text-muted)', fontSize: 13 }}>
                    No reconciliations yet — use the row above to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal (when not inline mode) ── */}
      {showModal && (
        <NewReconciliationModal
          onClose={() => { setShowModal(false); router.refresh() }}
        />
      )}
    </div>
  )
}
