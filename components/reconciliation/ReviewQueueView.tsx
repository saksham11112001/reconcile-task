'use client'

import { useState, useMemo } from 'react'
import { ReviewStatusBadge, MismatchTypeBadge, SeverityBadge } from '@/components/ui/Badge'
import { MismatchDetailPanel } from './MismatchDetailPanel'
import { fmtDate } from '@/lib/utils/format'
import { toast } from '@/store/appStore'
import { ChevronDown, Filter, CheckSquare, Square, Loader } from 'lucide-react'
import type { ReconMismatch, ReviewStatus, MismatchType, DecisionType } from '@/types'

// ─── Label maps ─────────────────────────────────────────────────

const TYPE_LABELS: Record<MismatchType, string> = {
  missing_in_bank:   'Missing in Bank',
  missing_in_ledger: 'Missing in Ledger',
  amount_mismatch:   'Amount Mismatch',
  date_mismatch:     'Date Mismatch',
  duplicate:         'Duplicate',
  tax_mismatch:      'Tax Mismatch',
  gstin_mismatch:    'GSTIN Mismatch',
}

const STATUS_TABS: { value: ReviewStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'All'       },
  { value: 'open',      label: 'Open'      },
  { value: 'escalated', label: 'Escalated' },
  { value: 'resolved',  label: 'Resolved'  },
  { value: 'ignored',   label: 'Ignored'   },
]

// ─── Props ──────────────────────────────────────────────────────

interface Props {
  mismatches: ReconMismatch[]
  reconId:    string
}

// ─── Component ──────────────────────────────────────────────────

export function ReviewQueueView({ mismatches: initial, reconId }: Props) {
  const [items,          setItems]          = useState<ReconMismatch[]>(initial)
  const [statusTab,      setStatusTab]      = useState<ReviewStatus | 'all'>('open')
  const [typeFilter,     setTypeFilter]     = useState<MismatchType | 'all'>('all')
  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [typeDropOpen,   setTypeDropOpen]   = useState(false)

  // ── Bulk selection ─────────────────────────────────────────
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set())
  const [bulkLoading,  setBulkLoading]  = useState(false)

  // ── Counts per status tab ──────────────────────────────────
  const counts = useMemo(() => {
    const c = { all: 0, open: 0, resolved: 0, ignored: 0, escalated: 0 }
    for (const m of items) {
      c.all++
      c[m.review_status]++
    }
    return c
  }, [items])

  // ── Filtered list ──────────────────────────────────────────
  const filtered = useMemo(() => {
    return items.filter(m => {
      if (statusTab !== 'all' && m.review_status !== statusTab) return false
      if (typeFilter !== 'all' && m.mismatch_type !== typeFilter) return false
      return true
    })
  }, [items, statusTab, typeFilter])

  const selected = items.find(m => m.id === selectedId) ?? null

  // ── Optimistic decision update (single) ───────────────────
  function handleDecision(mismatchId: string, decision: DecisionType) {
    const statusMap: Record<DecisionType, ReviewStatus> = {
      resolved:  'resolved',
      ignored:   'ignored',
      escalated: 'escalated',
      reopened:  'open',
    }
    setItems(prev =>
      prev.map(m =>
        m.id === mismatchId ? { ...m, review_status: statusMap[decision] } : m
      )
    )
    if (statusTab !== 'all') {
      if (statusMap[decision] !== statusTab) setSelectedId(null)
    }
    // Clear from bulk selection
    setSelectedIds(prev => { const n = new Set(prev); n.delete(mismatchId); return n })
  }

  // ── Bulk actions ───────────────────────────────────────────
  const filteredIds = useMemo(() => new Set(filtered.map(m => m.id)), [filtered])
  const allFilteredSelected = filteredIds.size > 0 &&
    [...filteredIds].every(id => selectedIds.has(id))

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filtered.forEach(m => next.add(m.id))
        return next
      })
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  async function handleBulkAction(decision: DecisionType) {
    const ids = [...selectedIds].filter(id => filteredIds.has(id))
    if (ids.length === 0) return

    setBulkLoading(true)
    const res = await fetch(`/api/reconciliations/${reconId}/mismatches/bulk`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ids, decision }),
    })
    setBulkLoading(false)

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error ?? 'Bulk action failed.')
      return
    }

    const statusMap: Record<DecisionType, ReviewStatus> = {
      resolved:  'resolved',
      ignored:   'ignored',
      escalated: 'escalated',
      reopened:  'open',
    }
    const newStatus = statusMap[decision]
    setItems(prev =>
      prev.map(m => ids.includes(m.id) ? { ...m, review_status: newStatus } : m)
    )
    setSelectedIds(new Set())
    toast.success(`${ids.length} item${ids.length !== 1 ? 's' : ''} ${decision}.`)
  }

  // ── UI helpers ─────────────────────────────────────────────
  const typeLabel = typeFilter === 'all' ? 'All types' : TYPE_LABELS[typeFilter]
  const availableTypes = useMemo(() =>
    Array.from(new Set(items.map(m => m.mismatch_type))) as MismatchType[],
    [items]
  )
  const bulkCount = [...selectedIds].filter(id => filteredIds.has(id)).length

  // ─────────────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

      {/* ── Main panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* ── Filter bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0,
          borderBottom: '1px solid var(--border)', background: 'var(--surface)',
          flexShrink: 0, padding: '0 1rem' }}>

          {/* Bulk select-all checkbox */}
          <button
            onClick={toggleSelectAll}
            title={allFilteredSelected ? 'Deselect all' : 'Select all visible'}
            style={{ padding: '0.6rem 0.4rem', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', marginRight: 4 }}>
            {allFilteredSelected
              ? <CheckSquare style={{ width: 15, height: 15, color: 'var(--brand)' }}/>
              : <Square style={{ width: 15, height: 15 }}/>
            }
          </button>

          {/* Status tabs */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {STATUS_TABS.map(tab => {
              const count  = counts[tab.value]
              const active = statusTab === tab.value
              return (
                <button key={tab.value}
                  onClick={() => { setStatusTab(tab.value); setSelectedId(null); setSelectedIds(new Set()) }}
                  style={{
                    padding: '0.7rem 0.85rem',
                    fontSize: 13.5, fontWeight: active ? 600 : 400,
                    color: active ? 'var(--brand)' : 'var(--text-secondary)',
                    background: 'transparent', border: 'none',
                    borderBottom: active ? '2px solid var(--brand)' : '2px solid transparent',
                    marginBottom: -1, cursor: 'pointer', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                  {tab.label}
                  {count > 0 && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 10,
                      background: active ? 'var(--brand-light)' : 'var(--border-light)',
                      color: active ? 'var(--brand)' : 'var(--text-muted)',
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div style={{ flex: 1 }}/>

          {filtered.length > 0 && bulkCount === 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', paddingRight: '0.5rem' }}>
              {filtered.length} item{filtered.length !== 1 ? 's' : ''}
            </span>
          )}

          {/* Type filter dropdown */}
          <div style={{ position: 'relative', marginLeft: 4 }}>
            <button
              onClick={() => setTypeDropOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6,
                padding: '0.45rem 0.8rem', fontSize: 13,
                color: typeFilter !== 'all' ? 'var(--brand)' : 'var(--text-secondary)',
                background: typeFilter !== 'all' ? 'var(--brand-light)' : 'transparent',
                border: '1px solid', borderColor: typeFilter !== 'all' ? 'var(--brand-border)' : 'var(--border)',
                borderRadius: 7, cursor: 'pointer', fontWeight: 500 }}>
              <Filter style={{ width: 13, height: 13 }}/>
              {typeLabel}
              <ChevronDown style={{ width: 13, height: 13, opacity: 0.6 }}/>
            </button>

            {typeDropOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                  onClick={() => setTypeDropOpen(false)}/>
                <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 20,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  minWidth: 200, overflow: 'hidden' }}>
                  {[{ value: 'all' as const, label: 'All types' },
                    ...availableTypes.map(t => ({ value: t, label: TYPE_LABELS[t] }))
                  ].map(opt => (
                    <button key={opt.value}
                      onClick={() => { setTypeFilter(opt.value); setTypeDropOpen(false) }}
                      style={{ display: 'block', width: '100%', textAlign: 'left',
                        padding: '0.55rem 0.9rem', fontSize: 13,
                        background: typeFilter === opt.value ? 'var(--brand-light)' : 'transparent',
                        color:      typeFilter === opt.value ? 'var(--brand)' : 'var(--text-primary)',
                        border: 'none', cursor: 'pointer',
                        fontWeight: typeFilter === opt.value ? 600 : 400 }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Bulk action bar ── */}
        {bulkCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8,
            padding: '0.55rem 1rem', borderBottom: '1px solid var(--border)',
            background: 'var(--brand-light)', flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand)' }}>
              {bulkCount} selected
            </span>
            <div style={{ flex: 1 }}/>
            {bulkLoading ? (
              <Loader style={{ width: 14, height: 14, color: 'var(--brand)' }} className="animate-spin"/>
            ) : (
              <>
                <button onClick={() => handleBulkAction('resolved')}
                  className="btn btn-sm"
                  style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                  Resolve all
                </button>
                <button onClick={() => handleBulkAction('ignored')}
                  className="btn btn-sm"
                  style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
                  Ignore all
                </button>
                <button onClick={() => handleBulkAction('escalated')}
                  className="btn btn-sm"
                  style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
                  Escalate all
                </button>
                <button onClick={() => setSelectedIds(new Set())}
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--text-muted)' }}>
                  Clear
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Table ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <EmptyState statusTab={statusTab} typeFilter={typeFilter} />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.55rem 0.5rem 0.55rem 1rem', width: 36 }}/>
                  {['Type', 'Severity', 'Description', 'Detected', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '0.55rem 1rem', textAlign: 'left',
                      fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <MismatchRow
                    key={m.id}
                    mismatch={m}
                    selected={selectedId === m.id}
                    checked={selectedIds.has(m.id)}
                    onCheck={e => { e.stopPropagation(); toggleSelectOne(m.id) }}
                    onClick={() => setSelectedId(m.id === selectedId ? null : m.id)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selected && (
        <MismatchDetailPanel
          mismatch={selected}
          reconId={reconId}
          onClose={() => setSelectedId(null)}
          onDecision={handleDecision}
        />
      )}
    </div>
  )
}

// ─── Row ────────────────────────────────────────────────────────

function MismatchRow({ mismatch: m, selected, checked, onCheck, onClick }: {
  mismatch: ReconMismatch
  selected: boolean
  checked:  boolean
  onCheck:  (e: React.MouseEvent) => void
  onClick:  () => void
}) {
  const desc = m.description ?? defaultDescription(m.mismatch_type, m.diff_data)

  return (
    <tr onClick={onClick}
      style={{
        borderBottom: '1px solid var(--border-light)',
        background: selected ? 'var(--brand-light)' : checked ? '#f0fdf4' : 'var(--surface)',
        cursor: 'pointer',
        borderLeft: selected ? '3px solid var(--brand)' : '3px solid transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!selected && !checked) (e.currentTarget as HTMLElement).style.background = 'var(--surface-subtle)' }}
      onMouseLeave={e => { if (!selected && !checked) (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}>

      <td style={{ padding: '0.75rem 0.5rem 0.75rem 1rem' }} onClick={onCheck}>
        {checked
          ? <CheckSquare style={{ width: 15, height: 15, color: 'var(--brand)' }}/>
          : <Square      style={{ width: 15, height: 15, color: 'var(--text-muted)' }}/>
        }
      </td>
      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
        <MismatchTypeBadge type={m.mismatch_type} />
      </td>
      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
        <SeverityBadge severity={m.severity} />
      </td>
      <td style={{ padding: '0.75rem 1rem', fontSize: 13.5, color: 'var(--text-primary)', maxWidth: 340 }}>
        <span style={{ display: '-webkit-box', WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {desc || '—'}
        </span>
      </td>
      <td style={{ padding: '0.75rem 1rem', fontSize: 12.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {fmtDate(m.detected_at)}
      </td>
      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
        <ReviewStatusBadge status={m.review_status} />
      </td>
      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 12.5, fontWeight: 600,
          color: selected ? 'var(--text-muted)' : 'var(--brand)' }}>
          {selected ? 'Close' : 'Review →'}
        </span>
      </td>
    </tr>
  )
}

// ─── Empty state ────────────────────────────────────────────────

function EmptyState({ statusTab, typeFilter }: {
  statusTab:  ReviewStatus | 'all'
  typeFilter: MismatchType | 'all'
}) {
  const hasFilter = statusTab !== 'all' || typeFilter !== 'all'

  const tabMessages: Partial<Record<ReviewStatus | 'all', string>> = {
    open:      'No open mismatches — all items have been reviewed.',
    resolved:  'No resolved mismatches yet.',
    ignored:   'No ignored mismatches yet.',
    escalated: 'No escalated mismatches.',
  }

  if (!hasFilter) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, margin: 0 }}>
          No mismatches found for this reconciliation.
        </p>
      </div>
    )
  }

  const msg = tabMessages[statusTab] ?? 'No items match the current filters.'
  return (
    <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>{msg}</p>
      {typeFilter !== 'all' && (
        <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 4 }}>
          Try clearing the type filter.
        </p>
      )}
    </div>
  )
}

// ─── Fallback description from diff_data ────────────────────────

function defaultDescription(type: MismatchType, diff: Record<string, unknown> | null): string {
  if (!diff) return ''
  switch (type) {
    case 'amount_mismatch':
      return `Bank: ${diff.bank_amount ?? '?'} · Ledger: ${diff.book_amount ?? '?'} · Δ ${diff.delta ?? '?'}`
    case 'date_mismatch':
      return `Bank date: ${diff.bank_date ?? '?'} · Ledger date: ${diff.book_date ?? '?'}`
    case 'gstin_mismatch':
      return `Bank GSTIN: ${diff.bank_gstin ?? '?'} · Ledger GSTIN: ${diff.book_gstin ?? '?'}`
    case 'missing_in_bank':
      return `Ledger ref: ${diff.reference ?? diff.description ?? '?'} not found in bank`
    case 'missing_in_ledger':
      return `Bank ref: ${diff.reference ?? diff.narration ?? '?'} not found in ledger`
    case 'duplicate':
      return `Duplicate entry: ${diff.reference ?? diff.amount ?? '?'}`
    case 'tax_mismatch':
      return `Expected tax: ${diff.expected_tax ?? '?'} · Actual: ${diff.actual_tax ?? '?'}`
    default:
      return ''
  }
}
