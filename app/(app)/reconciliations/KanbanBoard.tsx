'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  FileUp, ClipboardList, AlertCircle, CheckCircle2, Loader2,
  GitCompare, X, Pencil, Calendar, User,
  AlertTriangle, RefreshCw, FileBarChart2,
} from 'lucide-react'
import { JobStatusBadge } from '@/components/ui/Badge'
import { fmtDate } from '@/lib/utils/format'
import { InlineReconRow } from '@/components/reconciliation/InlineReconRow'
import type { Reconciliation, Client } from '@/types'

// ─── Column definitions ─────────────────────────────────────────

interface KanbanCol {
  id:       string
  label:    string
  color:    string
  dotColor: string
  emptyMsg: string
}

const COLS: KanbanCol[] = [
  {
    id:       'pending',
    label:    'Pending Upload',
    color:    '#94a3b8',
    dotColor: '#cbd5e1',
    emptyMsg: 'No reconciliations awaiting upload',
  },
  {
    id:       'uploaded',
    label:    'Files Uploaded',
    color:    '#1d4ed8',
    dotColor: '#93c5fd',
    emptyMsg: 'Upload files to see them here',
  },
  {
    id:       'review',
    label:    'In Review',
    color:    '#d97706',
    dotColor: '#fcd34d',
    emptyMsg: 'No open mismatches to review',
  },
  {
    id:       'clean',
    label:    'All Matched',
    color:    '#15803d',
    dotColor: '#86efac',
    emptyMsg: 'Nothing here yet',
  },
  {
    id:       'completed',
    label:    'Completed',
    color:    '#0d9488',
    dotColor: '#5eead4',
    emptyMsg: 'Completed reconciliations appear here',
  },
]

// ─── Column assignment ─────────────────────────────────────────

function getColId(r: Reconciliation): string {
  if (r.status === 'completed') return 'completed'
  if (r.job_status === 'ready' && (r.open_mismatches ?? 0) === 0) return 'clean'
  if (r.job_status === 'ready') return 'review'
  if (r.job_status === 'processing' || r.job_status === 'uploaded') return 'uploaded'
  return 'pending' // 'pending' or 'failed'
}

// ─── Props ──────────────────────────────────────────────────────

interface Props {
  list:          Reconciliation[]
  clients:       Pick<Client, 'id' | 'name' | 'color'>[]
  clientMap:     Record<string, Pick<Client, 'name' | 'color'>>
  onCreated:     (r: Reconciliation) => void
  onSaved:       (r: Reconciliation) => void
}

// ─── Board ─────────────────────────────────────────────────────

export function KanbanBoard({ list, clients, clientMap, onCreated, onSaved }: Props) {
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [detailId,  setDetailId]    = useState<string | null>(null)

  const detailRecon = detailId ? list.find(r => r.id === detailId) ?? null : null

  return (
    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '1rem 0 1.25rem',
      alignItems: 'flex-start', minHeight: 480 }}>

      {COLS.map(col => {
        const colItems = list.filter(r => getColId(r) === col.id)
        return (
          <div key={col.id} className="kanban-col" style={{ minWidth: 272, maxWidth: 272 }}>

            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7,
              padding: '0.65rem 0.85rem', borderBottom: '1px solid var(--border)',
              background: 'var(--surface)', flexShrink: 0 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%',
                background: col.dotColor, flexShrink: 0, display: 'inline-block',
                boxShadow: `0 0 0 3px ${col.color}22` }}/>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)',
                letterSpacing: '0.01em' }}>
                {col.label}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 600,
                padding: '1px 6px', borderRadius: 9,
                background: colItems.length ? `${col.color}18` : 'var(--border-light)',
                color:      colItems.length ? col.color : 'var(--text-muted)' }}>
                {colItems.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem',
              display: 'flex', flexDirection: 'column', gap: 8 }}>

              {colItems.map(r => {
                if (editingId === r.id) {
                  return (
                    <div key={r.id} style={{ background: 'var(--surface-subtle)',
                      border: '1.5px solid var(--brand)', borderRadius: 10,
                      overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          <InlineReconRow
                            mode="edit"
                            recon={r}
                            clients={clients}
                            colSpan={1}
                            onSaved={saved => { onSaved(saved); setEditingId(null) }}
                            onCancel={() => setEditingId(null)}
                          />
                        </tbody>
                      </table>
                    </div>
                  )
                }

                return (
                  <ReconCard
                    key={r.id}
                    recon={r}
                    clientMap={clientMap}
                    colColor={col.color}
                    onEdit={() => setEditingId(r.id)}
                    onOpenDetail={() => setDetailId(r.id)}
                  />
                )
              })}

              {/* Inline add row — only in Pending Upload column */}
              {col.id === 'pending' && (
                <div style={{ background: 'var(--surface-subtle)', borderRadius: 10,
                  overflow: 'hidden', border: '1px dashed var(--border)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <InlineReconRow
                        mode="add"
                        clients={clients}
                        colSpan={1}
                        onCreated={r => onCreated(r)}
                      />
                    </tbody>
                  </table>
                </div>
              )}

              {colItems.length === 0 && col.id !== 'pending' && (
                <div style={{ padding: '2rem 0.5rem', textAlign: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{col.emptyMsg}</span>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Detail panel */}
      {detailRecon && (
        <DetailPanel
          recon={detailRecon}
          clientMap={clientMap}
          onClose={() => setDetailId(null)}
          onEdit={() => { setEditingId(detailRecon.id); setDetailId(null) }}
        />
      )}
    </div>
  )
}

// ─── Card ───────────────────────────────────────────────────────

function ReconCard({ recon: r, clientMap, colColor, onEdit, onOpenDetail }: {
  recon:        Reconciliation
  clientMap:    Record<string, Pick<Client, 'name' | 'color'>>
  colColor:     string
  onEdit:       () => void
  onOpenDetail: () => void
}) {
  const cl          = r.client_id ? clientMap[r.client_id] : null
  const hasOpen     = (r.open_mismatches  ?? 0) > 0
  const hasMatched  = (r.total_matched    ?? 0) > 0
  const hasFailed   = r.job_status === 'failed'
  const processing  = r.job_status === 'processing'

  return (
    <div
      onClick={onOpenDetail}
      className="card-elevated"
      style={{ cursor: 'pointer', borderRadius: 10, padding: '0.75rem',
        borderLeft: `3px solid ${colColor}`,
        transition: 'box-shadow 0.15s, border-color 0.15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 3px 16px rgba(0,0,0,0.09)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '' }}>

      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
          flex: 1, lineHeight: 1.35 }}>
          {r.name}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onEdit() }}
          title="Edit"
          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 2, borderRadius: 4,
            opacity: 0.55, transition: 'opacity 0.12s, color 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--brand)' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.55'; e.currentTarget.style.color = 'var(--text-muted)' }}>
          <Pencil style={{ width: 11, height: 11 }}/>
        </button>
      </div>

      {/* Client chip */}
      {cl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2,
            background: cl.color, flexShrink: 0, display: 'inline-block' }}/>
          <span style={{ fontSize: 11.5, color: 'var(--text-secondary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cl.name}
          </span>
        </div>
      )}

      {/* Period */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
        <Calendar style={{ width: 10, height: 10, flexShrink: 0 }}/>
        {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
      </div>

      {/* Failed banner */}
      {hasFailed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8,
          padding: '4px 8px', borderRadius: 5, background: '#fef2f2',
          border: '1px solid #fecaca' }}>
          <AlertTriangle style={{ width: 10, height: 10, color: '#b91c1c', flexShrink: 0 }}/>
          <span style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>Processing failed</span>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {hasOpen && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 11.5, fontWeight: 700, color: '#b91c1c',
            background: '#fef2f2', padding: '1px 6px', borderRadius: 4,
            border: '1px solid #fecaca' }}>
            <AlertCircle style={{ width: 9, height: 9 }}/> {r.open_mismatches} open
          </span>
        )}
        {hasMatched && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 11.5, fontWeight: 600, color: '#15803d',
            background: '#f0fdf4', padding: '1px 6px', borderRadius: 4,
            border: '1px solid #bbf7d0' }}>
            <CheckCircle2 style={{ width: 9, height: 9 }}/> {r.total_matched} matched
          </span>
        )}
        {processing && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11.5, color: '#7c3aed', fontWeight: 500 }}>
            <Loader2 style={{ width: 10, height: 10 }} className="animate-spin"/> Processing…
          </span>
        )}
      </div>

      {/* Footer: job status + action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 6 }}>
        <JobStatusBadge status={r.job_status} />
        <QuickAction recon={r} />
      </div>
    </div>
  )
}

// ─── Quick action button per column state ──────────────────────

function QuickAction({ recon: r }: { recon: Reconciliation }) {
  const colId = getColId(r)
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5,
    textDecoration: 'none', border: 'none', cursor: 'pointer',
  }

  if (colId === 'pending' || r.job_status === 'failed') {
    return (
      <Link href={`/reconciliations/${r.id}`} onClick={e => e.stopPropagation()}
        style={{ ...baseStyle, color: 'var(--brand)', background: 'var(--brand-light)',
          border: '1px solid var(--brand-border)' }}>
        {r.job_status === 'failed'
          ? <><RefreshCw style={{ width: 9, height: 9 }}/> Retry</>
          : <><FileUp style={{ width: 9, height: 9 }}/> Upload</>
        }
      </Link>
    )
  }
  if (colId === 'review') {
    return (
      <Link href={`/reconciliations/${r.id}/review`} onClick={e => e.stopPropagation()}
        style={{ ...baseStyle, color: '#92400e', background: '#fffbeb',
          border: '1px solid #fde68a' }}>
        <ClipboardList style={{ width: 9, height: 9 }}/> Review
      </Link>
    )
  }
  if (colId === 'clean') {
    return (
      <Link href={`/reconciliations/${r.id}`} onClick={e => e.stopPropagation()}
        style={{ ...baseStyle, color: '#15803d', background: '#f0fdf4',
          border: '1px solid #bbf7d0' }}>
        <CheckCircle2 style={{ width: 9, height: 9 }}/> Finalize
      </Link>
    )
  }
  if (colId === 'completed') {
    return (
      <Link href={`/reconciliations/${r.id}/report`} onClick={e => e.stopPropagation()}
        style={{ ...baseStyle, color: 'var(--brand)', background: 'var(--brand-light)',
          border: '1px solid var(--brand-border)' }}>
        <FileBarChart2 style={{ width: 9, height: 9 }}/> Report
      </Link>
    )
  }
  return (
    <Link href={`/reconciliations/${r.id}`} onClick={e => e.stopPropagation()}
      style={{ ...baseStyle, color: 'var(--text-secondary)', background: 'var(--surface-subtle)',
        border: '1px solid var(--border)' }}>
      Open →
    </Link>
  )
}

// ─── Detail panel (slide-in on card click) ────────────────────

function DetailPanel({ recon: r, clientMap, onClose, onEdit }: {
  recon:     Reconciliation
  clientMap: Record<string, Pick<Client, 'name' | 'color'>>
  onClose:   () => void
  onEdit:    () => void
}) {
  const cl      = r.client_id ? clientMap[r.client_id] : null
  const colId   = getColId(r)
  const col     = COLS.find(c => c.id === colId)!
  const hasOpen = (r.open_mismatches ?? 0) > 0

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(15,23,42,0.25)', backdropFilter: 'blur(2px)' }}/>

      {/* Panel */}
      <div style={{ position: 'fixed', top: '50%', left: '50%', zIndex: 50,
        transform: 'translate(-50%, -50%)',
        width: 440, maxWidth: '94vw', maxHeight: '88vh',
        background: 'var(--surface)', borderRadius: 14,
        border: '1px solid var(--border)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'fadeUp 0.15s ease both' }}>

        {/* Panel header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%',
                background: col.dotColor, flexShrink: 0,
                boxShadow: `0 0 0 2px ${col.color}30`,
                display: 'inline-block' }}/>
              <span style={{ fontSize: 11, fontWeight: 700, color: col.color,
                textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {col.label}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700,
              color: 'var(--text-primary)', lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.name}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button onClick={onEdit}
              title="Edit reconciliation"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--surface-subtle)', cursor: 'pointer',
                color: 'var(--text-secondary)' }}>
              <Pencil style={{ width: 12, height: 12 }}/>
            </button>
            <button onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 6, border: 'none',
                background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X style={{ width: 15, height: 15 }}/>
            </button>
          </div>
        </div>

        {/* Panel body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>

          {/* Client */}
          {cl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem',
              padding: '0.6rem 0.85rem', borderRadius: 8,
              background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3,
                background: cl.color, flexShrink: 0, display: 'inline-block' }}/>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {cl.name}
                </div>
              </div>
            </div>
          )}

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
            marginBottom: '1.25rem' }}>
            <MetaCell label="Period" value={`${fmtDate(r.period_start)} – ${fmtDate(r.period_end)}`} />
            <MetaCell label="Status" value={r.status.replace('_', ' ')} capitalize />
            <MetaCell label="Files" value={<JobStatusBadge status={r.job_status}/>} />
            {r.assignee_id && <MetaCell label="Assignee" value="Assigned" icon={<User style={{ width: 10, height: 10 }}/>} />}
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
            marginBottom: '1.25rem' }}>
            <StatBox
              label="Matched"
              value={r.total_matched ?? 0}
              color={(r.total_matched ?? 0) > 0 ? '#15803d' : 'var(--text-muted)'}
              bg={(r.total_matched ?? 0) > 0 ? '#f0fdf4' : 'var(--surface-subtle)'}
            />
            <StatBox
              label="Open Issues"
              value={(r.open_mismatches ?? 0) > 0 ? r.open_mismatches! : '—'}
              color={(r.open_mismatches ?? 0) > 0 ? '#b91c1c' : 'var(--text-muted)'}
              bg={(r.open_mismatches ?? 0) > 0 ? '#fef2f2' : 'var(--surface-subtle)'}
            />
            <StatBox
              label="Total Mismatches"
              value={r.total_mismatches ?? 0}
              color={(r.total_mismatches ?? 0) > 0 ? '#92400e' : 'var(--text-muted)'}
              bg={(r.total_mismatches ?? 0) > 0 ? '#fffbeb' : 'var(--surface-subtle)'}
            />
          </div>

          {/* Failed error */}
          {r.job_status === 'failed' && r.job_error && (
            <div style={{ padding: '0.65rem 0.85rem', borderRadius: 8,
              background: '#fef2f2', border: '1px solid #fecaca', marginBottom: '1rem' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c',
                marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Processing Error
              </div>
              <div style={{ fontSize: 12.5, color: '#b91c1c' }}>{r.job_error}</div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hasOpen && (
              <Link href={`/reconciliations/${r.id}/review`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, padding: '0.65rem', borderRadius: 8,
                  background: '#fffbeb', border: '1px solid #fde68a',
                  color: '#92400e', fontWeight: 600, fontSize: 13.5,
                  textDecoration: 'none' }}>
                <ClipboardList style={{ width: 14, height: 14 }}/>
                Review {r.open_mismatches} Open Mismatch{r.open_mismatches !== 1 ? 'es' : ''}
              </Link>
            )}
            {r.status === 'completed' && (
              <Link href={`/reconciliations/${r.id}/report`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, padding: '0.65rem', borderRadius: 8,
                  background: 'var(--brand-light)', border: '1px solid var(--brand-border)',
                  color: 'var(--brand)', fontWeight: 600, fontSize: 13.5,
                  textDecoration: 'none' }}>
                <FileBarChart2 style={{ width: 14, height: 14 }}/> View Report
              </Link>
            )}
            <Link href={`/reconciliations/${r.id}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, padding: '0.65rem', borderRadius: 8,
                background: 'var(--surface-subtle)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontWeight: 500, fontSize: 13,
                textDecoration: 'none' }}>
              <GitCompare style={{ width: 14, height: 14 }}/> Open Full Workspace
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Small helpers ───────────────────────────────────────────────

function MetaCell({ label, value, capitalize = false, icon }: {
  label:       string
  value:       React.ReactNode
  capitalize?: boolean
  icon?:       React.ReactNode
}) {
  return (
    <div style={{ padding: '0.55rem 0.75rem', borderRadius: 7,
      background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500,
        display: 'flex', alignItems: 'center', gap: 5,
        textTransform: capitalize ? 'capitalize' : undefined }}>
        {icon}{value}
      </div>
    </div>
  )
}

function StatBox({ label, value, color, bg }: {
  label: string; value: React.ReactNode; color: string; bg: string
}) {
  return (
    <div style={{ padding: '0.65rem 0.5rem', borderRadius: 8,
      background: bg, border: '1px solid var(--border)', textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3,
        textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
        {label}
      </div>
    </div>
  )
}
