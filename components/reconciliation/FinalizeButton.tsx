'use client'

import { useState } from 'react'
import { toast } from '@/store/appStore'
import { Lock, Unlock, Loader } from 'lucide-react'

interface Props {
  reconId:      string
  isFinalized:  boolean
  openCount:    number
  canFinalize:  boolean  // role-based: owner/admin/reviewer only
  onToggle:     (isFinalized: boolean) => void
}

export function FinalizeButton({ reconId, isFinalized, openCount, canFinalize, onToggle }: Props) {
  const [loading, setLoading] = useState(false)

  if (!canFinalize) return null

  async function handleClick() {
    if (!isFinalized && openCount > 0) {
      toast.error(`${openCount} mismatch${openCount !== 1 ? 'es' : ''} still open — resolve all before finalizing.`)
      return
    }

    const confirmMsg = isFinalized
      ? 'Remove finalization and unlock this period for editing?'
      : 'Finalize this period? It will be locked from further edits.'

    if (!confirm(confirmMsg)) return

    setLoading(true)
    const res = await fetch(`/api/reconciliations/${reconId}/finalize`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ unfinalize: isFinalized }),
    })
    setLoading(false)

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error ?? 'Failed to update finalization.')
      return
    }

    const updated = await res.json()
    toast.success(isFinalized ? 'Period unlocked.' : 'Period finalized.')
    onToggle(updated.is_finalized)
  }

  if (isFinalized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6,
          padding: '0.4rem 0.85rem', borderRadius: 7,
          background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <Lock style={{ width: 13, height: 13, color: '#15803d' }}/>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#15803d' }}>Finalized</span>
        </div>
        <button onClick={handleClick} disabled={loading}
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {loading
            ? <Loader style={{ width: 12, height: 12 }} className="animate-spin"/>
            : <><Unlock style={{ width: 12, height: 12 }}/> Unlock</>
          }
        </button>
      </div>
    )
  }

  return (
    <button onClick={handleClick} disabled={loading || openCount > 0}
      className="btn btn-outline btn-sm"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
      title={openCount > 0 ? `${openCount} mismatch${openCount !== 1 ? 'es' : ''} still open` : undefined}>
      {loading
        ? <Loader style={{ width: 13, height: 13 }} className="animate-spin"/>
        : <><Lock style={{ width: 13, height: 13 }}/> Finalize Period</>
      }
    </button>
  )
}
