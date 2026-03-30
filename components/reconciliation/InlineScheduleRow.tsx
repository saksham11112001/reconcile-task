'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from '@/store/appStore'
import { Plus, X, Check, Loader, RefreshCw } from 'lucide-react'
import type { RecurringRecon, Client } from '@/types'

interface Props {
  clients:   Pick<Client, 'id' | 'name'>[]
  colSpan:   number
  onCreated: (s: RecurringRecon) => void
}

export function InlineScheduleRow({ clients, colSpan, onCreated }: Props) {
  const [open,       setOpen]       = useState(false)
  const [name,       setName]       = useState('')
  const [clientId,   setClientId]   = useState('')
  const [frequency,  setFrequency]  = useState<'monthly' | 'quarterly'>('monthly')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [remindDays, setRemindDays] = useState('3')
  const [autoCreate, setAutoCreate] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const rowRef   = useRef<HTMLTableRowElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus name when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  // Click-outside: collapse when name is empty
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        if (!name.trim()) setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, name])

  function reset() {
    setName(''); setClientId(''); setFrequency('monthly')
    setDayOfMonth('1'); setRemindDays('3'); setAutoCreate(false)
    setError(null); setOpen(false)
  }

  async function handleSave() {
    if (!name.trim()) { setError('Schedule name is required.'); return }
    const day = parseInt(dayOfMonth)
    if (isNaN(day) || day < 1 || day > 28) { setError('Day of month must be 1–28.'); return }

    setError(null)
    setSaving(true)

    const res = await fetch('/api/recurring-recons', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name:         name.trim(),
        client_id:    clientId    || null,
        frequency,
        day_of_month: day,
        remind_days:  parseInt(remindDays) || 3,
        auto_create:  autoCreate,
      }),
    })
    setSaving(false)

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Failed to create schedule.')
      return
    }

    const created: RecurringRecon = await res.json()
    toast.success('Recurring schedule created.')
    onCreated(created)
    reset()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
    if (e.key === 'Escape') reset()
  }

  // ── Collapsed trigger ─────────────────────────────────────────
  if (!open) {
    return (
      <tr ref={rowRef}>
        <td colSpan={colSpan} style={{ padding: '0 0.5rem' }}>
          <button
            onClick={() => setOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 13, fontWeight: 500,
              padding: '0.6rem 0.5rem', borderRadius: 6,
              width: '100%', transition: 'color 0.12s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
            <Plus style={{ width: 14, height: 14 }}/> New Schedule
          </button>
        </td>
      </tr>
    )
  }

  // ── Expanded form ─────────────────────────────────────────────
  return (
    <tr ref={rowRef}
      style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
      <td colSpan={colSpan} style={{ padding: '0.75rem 1rem' }}>

        {/* Row 1: name + fields */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

          {/* Name */}
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Schedule name…"
            style={{ fontSize: 13.5, fontWeight: 500,
              padding: '4px 8px', borderRadius: 6, minWidth: 220, flex: '1 1 220px',
              border: '1.5px solid var(--brand)', outline: 'none',
              background: 'var(--surface)', color: 'var(--text-primary)' }}
          />

          {/* Client */}
          <SchedulePill color="#0d9488" label="Client">
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              style={pillSelectStyle}>
              <option value="">No client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </SchedulePill>

          {/* Frequency */}
          <SchedulePill color="#7c3aed" label="Frequency">
            <select value={frequency} onChange={e => setFrequency(e.target.value as 'monthly' | 'quarterly')}
              style={pillSelectStyle}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </SchedulePill>

          {/* Day of month */}
          <SchedulePill color="#1d4ed8" label="Day">
            <input
              type="number" min={1} max={28}
              value={dayOfMonth}
              onChange={e => setDayOfMonth(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ ...pillSelectStyle, width: 36 }}
            />
          </SchedulePill>

          {/* Remind days */}
          <SchedulePill color="#92400e" label="Remind">
            <input
              type="number" min={0} max={30}
              value={remindDays}
              onChange={e => setRemindDays(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ ...pillSelectStyle, width: 28 }}
            />
            <span style={{ fontSize: 11.5, opacity: 0.75, marginLeft: 2 }}>days before</span>
          </SchedulePill>

          {/* Auto-create toggle */}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
            padding: '3px 8px 3px 6px', borderRadius: 20,
            border: `1px solid ${autoCreate ? '#0d948830' : 'var(--border)'}`,
            background: autoCreate ? '#0d948812' : 'var(--surface)',
            color: autoCreate ? 'var(--brand)' : 'var(--text-secondary)',
            whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={autoCreate}
              onChange={e => setAutoCreate(e.target.checked)}
              style={{ width: 12, height: 12, cursor: 'pointer', accentColor: 'var(--brand)' }}/>
            <RefreshCw style={{ width: 11, height: 11 }}/> Auto-create
          </label>

          {/* Actions */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 600,
                background: name.trim() ? 'var(--brand)' : 'var(--border)',
                color:      name.trim() ? '#fff' : 'var(--text-muted)',
                opacity: saving ? 0.7 : 1 }}>
              {saving
                ? <><Loader style={{ width: 12, height: 12 }} className="animate-spin"/>Saving…</>
                : <><Check style={{ width: 12, height: 12 }}/>Create</>
              }
            </button>
            <button
              onClick={reset}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 26, height: 26, borderRadius: 6, border: 'none',
                background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X style={{ width: 14, height: 14 }}/>
            </button>
          </div>
        </div>

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

function SchedulePill({ color, label, children }: {
  color:    string
  label:    string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px 3px 6px', borderRadius: 20,
      border: `1px solid ${color}30`, background: `${color}12`,
      color, fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: 10.5, opacity: 0.7, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}:
      </span>
      {children}
    </div>
  )
}
