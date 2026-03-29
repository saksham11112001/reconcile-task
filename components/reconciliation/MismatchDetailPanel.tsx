'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { ReviewStatusBadge, MismatchTypeBadge, SeverityBadge } from '@/components/ui/Badge'
import { fmtDate, fmtDateTime } from '@/lib/utils/format'
import { toast } from '@/store/appStore'
import { X, CheckCircle, EyeOff, ArrowUpCircle, RotateCcw, Loader } from 'lucide-react'
import type { ReconMismatch, MismatchDecision, DecisionType } from '@/types'

interface Props {
  mismatch:   ReconMismatch
  reconId:    string
  onClose:    () => void
  onDecision: (mismatchId: string, decision: DecisionType) => void
}

export function MismatchDetailPanel({ mismatch, reconId, onClose, onDecision }: Props) {
  const [note,        setNote]        = useState('')
  const [loading,     setLoading]     = useState<DecisionType | null>(null)
  const [history,     setHistory]     = useState<MismatchDecision[]>([])
  const [histLoading, setHistLoading] = useState(false)

  // Load decision history whenever the selected mismatch changes
  useEffect(() => {
    let cancelled = false
    setHistory([])
    setHistLoading(true)

    fetch(`/api/reconciliations/${reconId}/mismatches/${mismatch.id}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setHistory(d.decisions ?? []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setHistLoading(false) })

    return () => { cancelled = true }
  }, [mismatch.id, reconId])

  async function handleDecision(decision: DecisionType) {
    setLoading(decision)
    const snap = note

    const res = await fetch(
      `/api/reconciliations/${reconId}/mismatches/${mismatch.id}`,
      {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ decision, note: note.trim() || undefined }),
      }
    )

    setLoading(null)

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error ?? 'Failed to update.')
      return
    }

    toast.success(decisionLabel(decision))
    setNote('')
    onDecision(mismatch.id, decision)

    // Append optimistic history entry
    setHistory(prev => [{
      id:          crypto.randomUUID(),
      org_id:      '',
      mismatch_id: mismatch.id,
      decision,
      note:        snap.trim() || null,
      decided_by:  null,
      decided_at:  new Date().toISOString(),
    }, ...prev])
  }

  const isOpen      = mismatch.review_status === 'open'
  const isEscalated = mismatch.review_status === 'escalated'
  const isResolved  = mismatch.review_status === 'resolved'
  const isIgnored   = mismatch.review_status === 'ignored'

  return (
    <>
      {/* Backdrop — clicking it closes the panel */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 30,
          background: 'rgba(15,23,42,0.25)', backdropFilter: 'blur(1px)' }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 420, maxWidth: '92vw',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
        zIndex: 40,
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.18s cubic-bezier(0.34,1.1,0.64,1) both',
      }}>
        <style>{`@keyframes slideInRight{from{transform:translateX(32px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

        {/* ── Panel header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          padding: '0.9rem 1.1rem', borderBottom: '1px solid var(--border)',
          flexShrink: 0 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <MismatchTypeBadge type={mismatch.mismatch_type} />
            <SeverityBadge severity={mismatch.severity} />
          </div>
          <ReviewStatusBadge status={mismatch.review_status} />
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 4, borderRadius: 5,
              display: 'flex', alignItems: 'center', marginLeft: 4 }}>
            <X style={{ width: 16, height: 16 }}/>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.1rem' }}>

          {/* Description */}
          <p style={{ margin: '0 0 1.1rem', fontSize: 14, color: 'var(--text-primary)',
            lineHeight: 1.6 }}>
            {mismatch.description || '—'}
          </p>

          {/* Diff data */}
          {mismatch.diff_data && Object.keys(mismatch.diff_data).length > 0 && (
            <DiffDataBlock data={mismatch.diff_data} type={mismatch.mismatch_type} />
          )}

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Detected {fmtDateTime(mismatch.detected_at)}
          </div>

          {/* ── Note input ── */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)',
              display: 'block', marginBottom: 5 }}>
              Note <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note explaining this decision…"
              rows={2}
              style={{ width: '100%', padding: '0.55rem 0.75rem',
                border: '1.5px solid var(--border)', borderRadius: 7,
                fontSize: 13, color: 'var(--text-primary)',
                background: 'var(--surface)', resize: 'vertical',
                fontFamily: 'inherit', outline: 'none', lineHeight: 1.5 }}
              onFocus={e => e.target.style.borderColor = 'var(--brand)'}
              onBlur={e  => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* ── Action buttons ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6,
            marginBottom: '1.5rem' }}>

            {/* Resolve */}
            {!isResolved && (
              <ActionButton
                icon={<CheckCircle style={{ width: 15, height: 15 }}/>}
                label="Mark as Resolved"
                hint="The discrepancy has been corrected or explained."
                bg="#f0fdf4" color="#15803d" border="#bbf7d0"
                loading={loading === 'resolved'}
                onClick={() => handleDecision('resolved')}
              />
            )}

            {/* Ignore */}
            {!isIgnored && (
              <ActionButton
                icon={<EyeOff style={{ width: 15, height: 15 }}/>}
                label="Ignore"
                hint="Known difference — acceptable, no action needed."
                bg="#f8fafc" color="#475569" border="#e2e8f0"
                loading={loading === 'ignored'}
                onClick={() => handleDecision('ignored')}
              />
            )}

            {/* Escalate */}
            {!isEscalated && (
              <ActionButton
                icon={<ArrowUpCircle style={{ width: 15, height: 15 }}/>}
                label="Escalate"
                hint="Flag for senior review or external clarification."
                bg="#fffbeb" color="#92400e" border="#fde68a"
                loading={loading === 'escalated'}
                onClick={() => handleDecision('escalated')}
              />
            )}

            {/* Reopen */}
            {!isOpen && (
              <ActionButton
                icon={<RotateCcw style={{ width: 15, height: 15 }}/>}
                label="Reopen"
                hint="Move back to open for further review."
                bg="#eff6ff" color="#1d4ed8" border="#bfdbfe"
                loading={loading === 'reopened'}
                onClick={() => handleDecision('reopened')}
              />
            )}
          </div>

          {/* ── Decision history ── */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
              History
            </div>
            {histLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                color: 'var(--text-muted)', fontSize: 13 }}>
                <Loader style={{ width: 13, height: 13 }} className="animate-spin"/>
                Loading…
              </div>
            ) : history.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                No decisions yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {history.map(d => (
                  <DecisionRow key={d.id} decision={d} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Action button ─────────────────────────────────────────────

function ActionButton({ icon, label, hint, bg, color, border, loading, onClick }: {
  icon:    ReactNode
  label:   string
  hint:    string
  bg:      string
  color:   string
  border:  string
  loading: boolean
  onClick: () => void
}) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '0.7rem 0.9rem', borderRadius: 8,
        background: bg, border: `1px solid ${border}`,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        textAlign: 'left', width: '100%',
        transition: 'opacity 0.15s, filter 0.15s' }}>
      <span style={{ color, marginTop: 1, flexShrink: 0 }}>
        {loading ? <Loader style={{ width: 15, height: 15 }} className="animate-spin"/> : icon}
      </span>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color }}>{label}</div>
        <div style={{ fontSize: 12, color, opacity: 0.75, marginTop: 1 }}>{hint}</div>
      </div>
    </button>
  )
}

// ─── Diff data block ───────────────────────────────────────────

function DiffDataBlock({ data, type }: {
  data: Record<string, unknown>
  type: string
}) {
  const rows = Object.entries(data)
  if (!rows.length) return null

  return (
    <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem',
      fontSize: 13 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
        Difference detail
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td style={{ padding: '3px 0', color: 'var(--text-muted)',
                fontSize: 12.5, paddingRight: '1rem', whiteSpace: 'nowrap' }}>
                {formatKey(k)}
              </td>
              <td style={{ padding: '3px 0', color: 'var(--text-primary)',
                fontWeight: 500, fontSize: 13 }}>
                {String(v)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Decision history row ──────────────────────────────────────

function DecisionRow({ decision: d }: { decision: MismatchDecision }) {
  const cfg: Record<DecisionType, { color: string; label: string }> = {
    resolved:  { color: '#15803d', label: 'Resolved'  },
    ignored:   { color: '#64748b', label: 'Ignored'   },
    escalated: { color: '#92400e', label: 'Escalated' },
    reopened:  { color: '#1d4ed8', label: 'Reopened'  },
  }
  const { color, label } = cfg[d.decision] ?? { color: 'var(--text-muted)', label: d.decision }

  return (
    <div style={{ padding: '0.6rem 0.8rem', borderRadius: 7,
      background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, marginBottom: d.note ? 4 : 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{label}</span>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
          {fmtDateTime(d.decided_at)}
        </span>
      </div>
      {d.note && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)',
          lineHeight: 1.5 }}>
          {d.note}
        </p>
      )}
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────

function formatKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function decisionLabel(d: DecisionType): string {
  return { resolved: 'Marked as resolved', ignored: 'Marked as ignored',
    escalated: 'Escalated', reopened: 'Reopened' }[d]
}
