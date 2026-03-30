'use client'

import { useState, useEffect } from 'react'
import { fmtDateTime } from '@/lib/utils/format'
import { Activity, Loader } from 'lucide-react'
import type { AuditLog, AuditAction } from '@/types'

interface Props {
  reconId: string
}

const ACTION_LABELS: Partial<Record<AuditAction | string, { label: string; color: string }>> = {
  recon_created:        { label: 'Reconciliation created',   color: 'var(--brand)'  },
  recon_finalized:      { label: 'Period finalized',         color: '#15803d'       },
  recon_unfinalized:    { label: 'Finalization removed',     color: '#92400e'       },
  upload_created:       { label: 'File uploaded',            color: 'var(--brand)'  },
  mismatch_resolved:    { label: 'Mismatch resolved',        color: '#15803d'       },
  mismatch_ignored:     { label: 'Mismatch ignored',         color: '#64748b'       },
  mismatch_escalated:   { label: 'Mismatch escalated',       color: '#92400e'       },
  mismatch_reopened:    { label: 'Mismatch reopened',        color: '#1d4ed8'       },
  checklist_updated:    { label: 'Checklist updated',        color: 'var(--brand)'  },
  doc_requested:        { label: 'Document requested',       color: '#7c3aed'       },
  doc_received:         { label: 'Document received',        color: '#15803d'       },
  doc_cancelled:        { label: 'Document request cancelled', color: '#64748b'     },
}

export function ActivityTimeline({ reconId }: Props) {
  const [logs,    setLogs]    = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/audit-logs?entity_type=reconciliation&entity_id=${reconId}&limit=15`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setLogs(d.data ?? []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reconId])

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8 }}>
        <Activity style={{ width: 15, height: 15, color: 'var(--brand)' }}/>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          Activity
        </span>
      </div>

      <div style={{ padding: loading || logs.length === 0 ? '1.5rem 1.1rem' : '0.5rem 0' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8,
            color: 'var(--text-muted)', fontSize: 13 }}>
            <Loader style={{ width: 13, height: 13 }} className="animate-spin"/>
            Loading activity…
          </div>
        ) : logs.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
            No activity recorded yet.
          </p>
        ) : (
          logs.map(log => {
            const cfg = ACTION_LABELS[log.action] ?? { label: log.action.replace(/_/g, ' '), color: 'var(--text-muted)' }
            const meta = log.meta as Record<string, unknown> | null
            return (
              <div key={log.id}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '0.55rem 1.1rem',
                  borderBottom: '1px solid var(--border-light)' }}>
                {/* Dot */}
                <div style={{ width: 7, height: 7, borderRadius: '50%',
                  background: cfg.color, flexShrink: 0, marginTop: 6 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                    {cfg.label}
                    {meta?.count && ` (${meta.count})`}
                  </div>
                  {log.actor_name && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      by {log.actor_name}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {fmtDateTime(log.created_at)}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
