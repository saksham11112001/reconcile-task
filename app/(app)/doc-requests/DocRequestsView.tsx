'use client'

import { useState, useMemo } from 'react'
import { toast } from '@/store/appStore'
import { fmtDate } from '@/lib/utils/format'
import { Plus, FileSearch, X, Loader, ChevronDown } from 'lucide-react'
import type { DocRequest, DocRequestStatus, Client } from '@/types'

// ─── Status config ───────────────────────────────────────────────

const STATUS_CFG: Record<DocRequestStatus, { label: string; bg: string; color: string; border: string }> = {
  requested: { label: 'Requested', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  pending:   { label: 'Pending',   bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  overdue:   { label: 'Overdue',   bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  received:  { label: 'Received',  bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  cancelled: { label: 'Cancelled', bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
}

const STATUS_TABS: { value: DocRequestStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'All'       },
  { value: 'requested', label: 'Requested' },
  { value: 'pending',   label: 'Pending'   },
  { value: 'overdue',   label: 'Overdue'   },
  { value: 'received',  label: 'Received'  },
  { value: 'cancelled', label: 'Cancelled' },
]

// ─── Props ───────────────────────────────────────────────────────

interface Props {
  requests:  DocRequest[]
  clients:   Pick<Client, 'id' | 'name' | 'color'>[]
  canManage: boolean
}

// ─── Component ───────────────────────────────────────────────────

export function DocRequestsView({ requests: initial, clients, canManage }: Props) {
  const [items,       setItems]       = useState<DocRequest[]>(initial)
  const [statusTab,   setStatusTab]   = useState<DocRequestStatus | 'all'>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [showNew,     setShowNew]     = useState(false)
  const [clientDrop,  setClientDrop]  = useState(false)

  // ── Counts per tab ─────────────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0 }
    for (const r of items) {
      c.all = (c.all || 0) + 1
      c[r.status] = (c[r.status] || 0) + 1
    }
    return c
  }, [items])

  // ── Filtered ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    return items.filter(r => {
      if (statusTab !== 'all' && r.status !== statusTab) return false
      if (clientFilter !== 'all' && r.client_id !== clientFilter) return false
      return true
    })
  }, [items, statusTab, clientFilter])

  // ── Update status ──────────────────────────────────────────
  async function updateStatus(id: string, status: DocRequestStatus) {
    const prev = items.find(r => r.id === id)
    if (!prev) return

    setItems(old => old.map(r => r.id === id ? { ...r, status } : r))
    const res = await fetch(`/api/doc-requests/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status }),
    })
    if (!res.ok) {
      setItems(old => old.map(r => r.id === id ? prev : r))
      toast.error('Failed to update status.')
    } else {
      toast.success(`Marked as ${STATUS_CFG[status].label}.`)
    }
  }

  // ── Add new request ────────────────────────────────────────
  function handleCreated(newItem: DocRequest) {
    setItems(prev => [newItem, ...prev])
    setShowNew(false)
  }

  const activeClient = clientFilter !== 'all' ? clients.find(c => c.id === clientFilter) : null

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8,
        padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', flexShrink: 0 }}>

        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {STATUS_TABS.map(tab => {
            const count  = counts[tab.value] ?? 0
            const active = statusTab === tab.value
            return (
              <button key={tab.value}
                onClick={() => setStatusTab(tab.value)}
                style={{ padding: '0.5rem 0.8rem', fontSize: 13, fontWeight: active ? 600 : 400,
                  color: active ? 'var(--brand)' : 'var(--text-secondary)',
                  background: 'transparent', border: 'none',
                  borderBottom: `2px solid ${active ? 'var(--brand)' : 'transparent'}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, marginBottom: -1 }}>
                {tab.label}
                {count > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 5px',
                    borderRadius: 9, background: active ? 'var(--brand-light)' : 'var(--border-light)',
                    color: active ? 'var(--brand)' : 'var(--text-muted)' }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ flex: 1 }}/>

        {/* Client filter */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setClientDrop(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6,
              padding: '0.4rem 0.75rem', fontSize: 13, borderRadius: 7, cursor: 'pointer',
              color: activeClient ? 'var(--brand)' : 'var(--text-secondary)',
              background: activeClient ? 'var(--brand-light)' : 'transparent',
              border: `1px solid ${activeClient ? 'var(--brand-border)' : 'var(--border)'}`,
              fontWeight: 500 }}>
            {activeClient ? activeClient.name : 'All clients'}
            <ChevronDown style={{ width: 13, height: 13, opacity: 0.6 }}/>
          </button>
          {clientDrop && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                onClick={() => setClientDrop(false)}/>
              <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 20,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                minWidth: 200, overflow: 'hidden' }}>
                {[{ id: 'all', name: 'All clients' }, ...clients].map(c => (
                  <button key={c.id}
                    onClick={() => { setClientFilter(c.id); setClientDrop(false) }}
                    style={{ display: 'block', width: '100%', textAlign: 'left',
                      padding: '0.55rem 0.9rem', fontSize: 13, border: 'none', cursor: 'pointer',
                      background: clientFilter === c.id ? 'var(--brand-light)' : 'transparent',
                      color:      clientFilter === c.id ? 'var(--brand)' : 'var(--text-primary)',
                      fontWeight: clientFilter === c.id ? 600 : 400 }}>
                    {c.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {canManage && (
          <button onClick={() => setShowNew(true)} className="btn btn-brand btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Plus style={{ width: 13, height: 13 }}/> New Request
          </button>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
            <FileSearch style={{ width: 40, height: 40, color: 'var(--border)', marginBottom: '1rem' }}/>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
              No document requests
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 1.25rem' }}>
              {statusTab !== 'all' ? `No ${STATUS_CFG[statusTab as DocRequestStatus]?.label?.toLowerCase()} requests.` : 'Create a request to ask your client for documents.'}
            </p>
            {canManage && statusTab === 'all' && (
              <button onClick={() => setShowNew(true)} className="btn btn-brand btn-sm">
                <Plus style={{ width: 13, height: 13 }}/> New Request
              </button>
            )}
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
                  {['Title', 'Client', 'Reconciliation', 'Due Date', 'Status', canManage ? 'Action' : ''].map(h => (
                    <th key={h} style={{ padding: '0.55rem 1rem', textAlign: 'left',
                      fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <DocRequestRow
                    key={r.id}
                    request={r}
                    canManage={canManage}
                    onStatusChange={updateStatus}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── New request modal ── */}
      {showNew && canManage && (
        <NewRequestModal
          clients={clients}
          onClose={() => setShowNew(false)}
          onCreate={handleCreated}
        />
      )}
    </div>
  )
}

// ─── Row ─────────────────────────────────────────────────────────

function DocRequestRow({ request: r, canManage, onStatusChange }: {
  request:        DocRequest
  canManage:      boolean
  onStatusChange: (id: string, status: DocRequestStatus) => void
}) {
  const [actionDrop, setActionDrop] = useState(false)
  const cfg = STATUS_CFG[r.status]
  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = r.due_date && r.due_date < today && r.status !== 'received' && r.status !== 'cancelled'

  return (
    <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
      <td style={{ padding: '0.75rem 1rem', fontSize: 13.5, fontWeight: 500,
        color: 'var(--text-primary)', maxWidth: 220 }}>
        <span style={{ display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {r.title}
        </span>
        {r.description && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.description}
          </div>
        )}
      </td>
      <td style={{ padding: '0.75rem 1rem', fontSize: 13, color: 'var(--text-secondary)' }}>
        {r.client_name ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </td>
      <td style={{ padding: '0.75rem 1rem', fontSize: 13, color: 'var(--text-secondary)',
        maxWidth: 160 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {r.recon_name ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
        </span>
      </td>
      <td style={{ padding: '0.75rem 1rem', fontSize: 13, whiteSpace: 'nowrap' }}>
        {r.due_date ? (
          <span style={{ color: isOverdue ? '#b91c1c' : 'var(--text-secondary)', fontWeight: isOverdue ? 600 : 400 }}>
            {fmtDate(r.due_date)}
            {isOverdue && ' — overdue'}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>—</span>
        )}
      </td>
      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
          borderRadius: 5, fontSize: 12, fontWeight: 600,
          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
          {cfg.label}
        </span>
      </td>
      {canManage && (
        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={() => setActionDrop(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.3rem 0.65rem',
                fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)',
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 6, cursor: 'pointer' }}>
              Update <ChevronDown style={{ width: 11, height: 11 }}/>
            </button>
            {actionDrop && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                  onClick={() => setActionDrop(false)}/>
                <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 20,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  minWidth: 160, overflow: 'hidden' }}>
                  {(['requested','pending','received','overdue','cancelled'] as DocRequestStatus[])
                    .filter(s => s !== r.status)
                    .map(s => {
                      const c = STATUS_CFG[s]
                      return (
                        <button key={s}
                          onClick={() => { onStatusChange(r.id, s); setActionDrop(false) }}
                          style={{ display: 'block', width: '100%', textAlign: 'left',
                            padding: '0.5rem 0.85rem', fontSize: 13, border: 'none',
                            cursor: 'pointer', background: 'transparent',
                            color: c.color }}>
                          Mark as {c.label}
                        </button>
                      )
                    })
                  }
                </div>
              </>
            )}
          </div>
        </td>
      )}
    </tr>
  )
}

// ─── New request modal ───────────────────────────────────────────

function NewRequestModal({ clients, onClose, onCreate }: {
  clients:  Pick<Client, 'id' | 'name' | 'color'>[]
  onClose:  () => void
  onCreate: (r: DocRequest) => void
}) {
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [clientId,    setClientId]    = useState('')
  const [dueDate,     setDueDate]     = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    setError(null)
    setSubmitting(true)

    const res = await fetch('/api/doc-requests', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        title:     title.trim(),
        description: description.trim() || undefined,
        client_id:   clientId || undefined,
        due_date:    dueDate  || undefined,
      }),
    })
    setSubmitting(false)

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Failed to create request.')
      return
    }
    const created = await res.json()
    toast.success('Document request created.')
    onCreate(created)
  }

  return (
    <>
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(2px)' }}/>
      <div style={{ position: 'fixed', top: '50%', left: '50%', zIndex: 50,
        transform: 'translate(-50%, -50%)',
        width: 460, maxWidth: '92vw', maxHeight: '90vh',
        background: 'var(--surface)', borderRadius: 12,
        border: '1px solid var(--border)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
        animation: 'fadeUp 0.15s ease both' }}>

        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            New Document Request
          </h2>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 4, borderRadius: 5 }}>
            <X style={{ width: 16, height: 16 }}/>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)',
              display: 'block', marginBottom: 5 }}>Title *</label>
            <input className="input" type="text" required
              placeholder="e.g. March 2026 bank statements"
              value={title} onChange={e => setTitle(e.target.value)}/>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)',
              display: 'block', marginBottom: 5 }}>
              Description <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <textarea className="input" rows={2}
              placeholder="Additional instructions for the client…"
              value={description} onChange={e => setDescription(e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)',
                display: 'block', marginBottom: 5 }}>Client</label>
              <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">— No client —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)',
                display: 'block', marginBottom: 5 }}>Due Date</label>
              <input className="input" type="date"
                value={dueDate} onChange={e => setDueDate(e.target.value)}/>
            </div>
          </div>

          {error && (
            <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-brand"
              style={{ minWidth: 120 }}>
              {submitting
                ? <><Loader style={{ width: 13, height: 13 }} className="animate-spin"/> Saving…</>
                : 'Create Request'
              }
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
