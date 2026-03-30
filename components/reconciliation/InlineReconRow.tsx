'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from '@/store/appStore'
import {
  Plus, X, Check, Loader, Calendar, User, UserCheck, Users2,
} from 'lucide-react'
import type { Reconciliation, Client } from '@/types'

interface MemberOption { id: string; name: string }

interface AddProps {
  mode:      'add'
  clients:   Pick<Client, 'id' | 'name' | 'color'>[]
  colSpan:   number
  onCreated: (r: Reconciliation) => void
}

interface EditProps {
  mode:      'edit'
  recon:     Reconciliation
  clients:   Pick<Client, 'id' | 'name' | 'color'>[]
  colSpan:   number
  onSaved:   (r: Reconciliation) => void
  onCancel:  () => void
}

type Props = AddProps | EditProps

export function InlineReconRow(props: Props) {
  const { mode, clients, colSpan } = props
  const isEdit = mode === 'edit'
  const recon  = isEdit ? props.recon : null

  // ── Form state ────────────────────────────────────────────────
  const [open,        setOpen]        = useState(isEdit)
  const [name,        setName]        = useState(recon?.name ?? '')
  const [clientId,    setClientId]    = useState(recon?.client_id ?? '')
  const [periodStart, setPeriodStart] = useState(recon?.period_start ?? '')
  const [periodEnd,   setPeriodEnd]   = useState(recon?.period_end ?? '')
  const [assigneeId,  setAssigneeId]  = useState(recon?.assignee_id ?? '')
  const [approverId,  setApproverId]  = useState(recon?.approver_id ?? '')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [members,     setMembers]     = useState<MemberOption[]>([])

  const rowRef   = useRef<HTMLTableRowElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Fetch org members once when row opens ────────────────────
  useEffect(() => {
    if (!open) return
    fetch('/api/team')
      .then(r => r.json())
      .then((data: Array<{ users?: { id: string; name?: string; email?: string } | null; is_active: boolean }>) => {
        setMembers(
          (data ?? [])
            .filter(m => m.is_active && m.users)
            .map(m => ({ id: m.users!.id, name: m.users!.name || m.users!.email || '' }))
        )
      })
      .catch(() => {})
  }, [open])

  // ── Auto-focus name input when row opens ────────────────────
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  // ── Click-outside: collapse add row if name empty ────────────
  useEffect(() => {
    if (!open || isEdit) return
    function handleClick(e: MouseEvent) {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        if (!name.trim()) setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, name, isEdit])

  function reset() {
    setName(''); setClientId(''); setPeriodStart(''); setPeriodEnd('')
    setAssigneeId(''); setApproverId(''); setError(null)
    if (!isEdit) setOpen(false)
  }

  // ── Save ────────────────────────────────────────────────────
  async function handleSave() {
    if (!name.trim()) { setError('Name is required.'); return }
    if (!periodStart)  { setError('Period start is required.'); return }
    if (!periodEnd)    { setError('Period end is required.'); return }
    if (periodEnd < periodStart) { setError('Period end must be after start.'); return }

    setError(null)
    setSaving(true)

    if (isEdit && recon) {
      // ── PATCH existing ──
      const res = await fetch(`/api/reconciliations/${recon.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:         name.trim(),
          client_id:    clientId    || null,
          period_start: periodStart,
          period_end:   periodEnd,
          assignee_id:  assigneeId  || null,
          approver_id:  approverId  || null,
        }),
      })
      setSaving(false)
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Failed to save.')
        return
      }
      const updated: Reconciliation = await res.json()
      toast.success('Reconciliation updated.')
      props.onSaved(updated)
    } else {
      // ── POST new ──
      const res = await fetch('/api/reconciliations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:         name.trim(),
          client_id:    clientId    || null,
          period_start: periodStart,
          period_end:   periodEnd,
          assignee_id:  assigneeId  || null,
          approver_id:  approverId  || null,
        }),
      })
      setSaving(false)
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Failed to create.')
        return
      }
      const created: Reconciliation = await res.json()
      toast.success('Reconciliation created.')
      ;(props as AddProps).onCreated(created)
      reset()
      setOpen(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
    if (e.key === 'Escape') {
      if (isEdit) props.onCancel()
      else reset()
    }
  }

  // ── Collapsed add trigger ────────────────────────────────────
  if (!open) {
    return (
      <tr ref={rowRef}>
        <td colSpan={colSpan}
          style={{ padding: '0 0.5rem' }}>
          <button
            onClick={() => setOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 13, fontWeight: 500,
              padding: '0.6rem 0.5rem', borderRadius: 6,
              width: '100%', transition: 'color 0.12s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
            <Plus style={{ width: 14, height: 14 }}/> New Reconciliation
          </button>
        </td>
      </tr>
    )
  }

  // ── Expanded form row ────────────────────────────────────────
  return (
    <tr ref={rowRef}
      style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
      <td colSpan={colSpan} style={{ padding: '0.6rem 1rem' }}>

        {/* Row 1: name + pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

          {/* Name input */}
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reconciliation name…"
            style={{ fontSize: 13.5, fontWeight: 500,
              padding: '4px 8px', borderRadius: 6, minWidth: 220, flex: '1 1 220px',
              border: '1.5px solid var(--brand)', outline: 'none',
              background: 'var(--surface)', color: 'var(--text-primary)' }}
          />

          {/* Client pill */}
          <Pill icon={<Users2 style={{ width: 12, height: 12 }}/>} color="#0d9488">
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              style={pillSelectStyle}>
              <option value="">Client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Pill>

          {/* Period start */}
          <Pill icon={<Calendar style={{ width: 12, height: 12 }}/>} color="#1d4ed8">
            <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ ...pillSelectStyle, minWidth: 130 }} />
          </Pill>

          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>→</span>

          {/* Period end */}
          <Pill icon={<Calendar style={{ width: 12, height: 12 }}/>} color="#1d4ed8">
            <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ ...pillSelectStyle, minWidth: 130 }} />
          </Pill>

          {/* Assignee */}
          <Pill icon={<User style={{ width: 12, height: 12 }}/>} color="#92400e">
            <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
              style={pillSelectStyle}>
              <option value="">Assignee</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Pill>

          {/* Approver */}
          <Pill icon={<UserCheck style={{ width: 12, height: 12 }}/>} color="#7c3aed">
            <select value={approverId} onChange={e => setApproverId(e.target.value)}
              style={pillSelectStyle}>
              <option value="">Approver</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Pill>

          {/* Actions */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || !periodStart || !periodEnd}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 600,
                background: name.trim() && periodStart && periodEnd ? 'var(--brand)' : 'var(--border)',
                color: name.trim() && periodStart && periodEnd ? '#fff' : 'var(--text-muted)',
                opacity: saving ? 0.7 : 1 }}>
              {saving
                ? <><Loader style={{ width: 12, height: 12 }} className="animate-spin"/>Saving…</>
                : <><Check style={{ width: 12, height: 12 }}/>{isEdit ? 'Save' : 'Add'}</>
              }
            </button>
            <button
              onClick={() => { if (isEdit) props.onCancel(); else reset() }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 26, height: 26, borderRadius: 6, border: 'none',
                background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X style={{ width: 14, height: 14 }}/>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ fontSize: 12, color: '#dc2626', marginTop: 5, paddingLeft: 2 }}>
            {error}
          </div>
        )}
      </td>
    </tr>
  )
}

// ─── Pill wrapper ─────────────────────────────────────────────

const pillSelectStyle: React.CSSProperties = {
  fontSize: 12.5, background: 'none', border: 'none', outline: 'none',
  color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', padding: 0,
}

function Pill({ icon, color, children }: {
  icon:     React.ReactNode
  color:    string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px 3px 6px', borderRadius: 20,
      border: `1px solid ${color}30`, background: `${color}12`,
      color, fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
      {icon}
      {children}
    </div>
  )
}
