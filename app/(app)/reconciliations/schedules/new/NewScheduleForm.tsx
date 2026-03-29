'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/store/appStore'
import type { Client } from '@/types'

interface Props { clients: Pick<Client, 'id' | 'name'>[] }

export function NewScheduleForm({ clients }: Props) {
  const router   = useRouter()
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [form,   setForm]   = useState({
    name:         '',
    client_id:    '',
    frequency:    'monthly',
    day_of_month: '1',
    remind_days:  '3',
    auto_create:  false,
  })

  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Schedule name is required'); return }
    setSaving(true); setError('')
    try {
      const res  = await fetch('/api/recurring-recons', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
      toast.success('Schedule created!')
      router.push('/reconciliations/schedules')
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2',
          border: '1px solid #fecaca', borderRadius: 8,
          color: '#b91c1c', fontSize: 13.5, marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

        <div>
          <label style={lbl}>Schedule Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            className="input" placeholder="e.g. Sharma & Associates — Monthly Bank Recon"
            style={{ marginTop: 6 }}/>
        </div>

        <div>
          <label style={lbl}>Client (optional)</label>
          <select value={form.client_id} onChange={e => set('client_id', e.target.value)}
            className="input" style={{ marginTop: 6 }}>
            <option value="">— No client linked —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={lbl}>Frequency</label>
            <select value={form.frequency} onChange={e => set('frequency', e.target.value)}
              className="input" style={{ marginTop: 6 }}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Day of Month (due date)</label>
            <input type="number" min={1} max={28}
              value={form.day_of_month} onChange={e => set('day_of_month', e.target.value)}
              className="input" placeholder="1–28" style={{ marginTop: 6 }}/>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Max 28 to work for all months.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={lbl}>Reminder (days before due date)</label>
            <input type="number" min={0} max={30}
              value={form.remind_days} onChange={e => set('remind_days', e.target.value)}
              className="input" placeholder="e.g. 3" style={{ marginTop: 6 }}/>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          padding: '0.75rem 1rem', background: 'var(--surface-subtle)',
          borderRadius: 8, border: '1px solid var(--border)' }}>
          <input type="checkbox" id="auto_create"
            checked={form.auto_create}
            onChange={e => set('auto_create', e.target.checked)}
            style={{ width: 15, height: 15, cursor: 'pointer' }}/>
          <label htmlFor="auto_create" style={{ cursor: 'pointer' }}>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>
              Auto-create reconciliation
            </span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
              Automatically create a new reconciliation record when this period comes due.
              You still need to upload files.
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button type="submit" disabled={saving} className="btn btn-brand" style={{ flex: 1 }}>
            {saving ? 'Saving...' : 'Create Schedule'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn btn-outline">
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}

const lbl: React.CSSProperties = {
  fontSize: 12, fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}
