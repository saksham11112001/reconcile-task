'use client'

import { useState } from 'react'
import { toast } from '@/store/appStore'
import { CheckCircle, Circle, Loader, ClipboardCheck } from 'lucide-react'

interface ChecklistState {
  uploads_received:    boolean
  review_complete:     boolean
  exceptions_handled:  boolean
  documents_complete:  boolean
  ready_to_finalize:   boolean
  notes:               string | null
}

interface Props {
  reconId:   string
  initial:   ChecklistState
  readOnly?: boolean
}

const ITEMS: { key: keyof Omit<ChecklistState, 'notes'>; label: string; hint: string }[] = [
  { key: 'uploads_received',    label: 'Uploads received',    hint: 'Bank statement and ledger files uploaded' },
  { key: 'review_complete',     label: 'Review complete',     hint: 'All mismatches reviewed or acknowledged' },
  { key: 'exceptions_handled',  label: 'Exceptions handled',  hint: 'Escalated items resolved or documented' },
  { key: 'documents_complete',  label: 'Documents complete',  hint: 'Supporting documents received from client' },
  { key: 'ready_to_finalize',   label: 'Ready to finalize',   hint: 'Period is reviewed and ready for sign-off' },
]

export function ReconChecklist({ reconId, initial, readOnly = false }: Props) {
  const [state,   setState]   = useState<ChecklistState>(initial)
  const [saving,  setSaving]  = useState<string | null>(null)

  const completedCount = ITEMS.filter(i => state[i.key]).length
  const allDone = completedCount === ITEMS.length

  async function toggle(key: keyof Omit<ChecklistState, 'notes'>) {
    if (readOnly) return
    const newVal = !state[key]
    setState(prev => ({ ...prev, [key]: newVal }))
    setSaving(key)

    const res = await fetch(`/api/reconciliations/${reconId}/checklist`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ [key]: newVal }),
    })

    setSaving(null)
    if (!res.ok) {
      setState(prev => ({ ...prev, [key]: !newVal })) // revert
      toast.error('Failed to update checklist.')
    }
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardCheck style={{ width: 15, height: 15, color: 'var(--brand)' }}/>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            Period Checklist
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {completedCount}/{ITEMS.length}
          </span>
          {/* Progress bar */}
          <div style={{ width: 60, height: 4, borderRadius: 2,
            background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: allDone ? '#15803d' : 'var(--brand)',
              width: `${(completedCount / ITEMS.length) * 100}%`,
              transition: 'width 0.3s ease',
            }}/>
          </div>
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: '0.5rem 0' }}>
        {ITEMS.map(item => {
          const checked   = state[item.key]
          const isSaving  = saving === item.key
          return (
            <button
              key={item.key}
              onClick={() => toggle(item.key)}
              disabled={readOnly || isSaving}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                width: '100%', padding: '0.55rem 1.1rem',
                background: 'transparent', border: 'none',
                cursor: readOnly ? 'default' : 'pointer',
                textAlign: 'left', opacity: readOnly ? 0.8 : 1,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!readOnly) (e.currentTarget as HTMLElement).style.background = 'var(--surface-subtle)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span style={{ flexShrink: 0, marginTop: 1, color: checked ? '#15803d' : 'var(--text-muted)' }}>
                {isSaving
                  ? <Loader style={{ width: 16, height: 16 }} className="animate-spin"/>
                  : checked
                    ? <CheckCircle style={{ width: 16, height: 16 }}/>
                    : <Circle      style={{ width: 16, height: 16 }}/>
                }
              </span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: checked ? 500 : 400,
                  color: checked ? 'var(--text-primary)' : 'var(--text-secondary)',
                  textDecoration: checked ? 'none' : 'none' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                  {item.hint}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* All done banner */}
      {allDone && (
        <div style={{ margin: '0 0.85rem 0.85rem', padding: '0.6rem 0.9rem',
          borderRadius: 7, background: '#f0fdf4', border: '1px solid #bbf7d0',
          display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle style={{ width: 14, height: 14, color: '#15803d', flexShrink: 0 }}/>
          <span style={{ fontSize: 13, color: '#15803d', fontWeight: 500 }}>
            All checklist items complete — ready to finalize.
          </span>
        </div>
      )}
    </div>
  )
}
