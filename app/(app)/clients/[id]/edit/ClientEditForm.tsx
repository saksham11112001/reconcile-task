'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/store/appStore'
import type { Client } from '@/types'

const COLORS = [
  '#0d9488','#7c3aed','#dc2626','#ca8a04',
  '#16a34a','#0891b2','#db2777','#4f46e5',
  '#ea580c','#374151',
]

export function ClientEditForm({ client }: { client: Client }) {
  const router   = useRouter()
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [form,   setForm]   = useState({
    name:           client.name,
    gstin:          client.gstin          ?? '',
    contact_person: client.contact_person ?? '',
    email:          client.email          ?? '',
    phone:          client.phone          ?? '',
    company:        client.company        ?? '',
    industry:       client.industry       ?? '',
    notes:          client.notes          ?? '',
    status:         client.status,
    color:          client.color,
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Client name is required'); return }
    setSaving(true); setError('')
    try {
      const res  = await fetch(`/api/clients/${client.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
      toast.success('Client updated!')
      router.push(`/clients/${client.id}`)
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 8, color: '#b91c1c', fontSize: 13.5, marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

        <div>
          <label style={labelStyle}>Client Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            className="input" placeholder="e.g. Sharma & Associates" style={{ marginTop: 6 }}/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>GSTIN</label>
            <input value={form.gstin} onChange={e => set('gstin', e.target.value)}
              className="input" placeholder="22AAAAA0000A1Z5" style={{ marginTop: 6, fontFamily: 'monospace' }}/>
          </div>
          <div>
            <label style={labelStyle}>Contact Person</label>
            <input value={form.contact_person} onChange={e => set('contact_person', e.target.value)}
              className="input" placeholder="Ramesh Sharma" style={{ marginTop: 6 }}/>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              className="input" placeholder="hello@firm.com" style={{ marginTop: 6 }}/>
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              className="input" placeholder="+91 98765 43210" style={{ marginTop: 6 }}/>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Company / Firm Name</label>
            <input value={form.company} onChange={e => set('company', e.target.value)}
              className="input" placeholder="Parent entity" style={{ marginTop: 6 }}/>
          </div>
          <div>
            <label style={labelStyle}>Industry</label>
            <input value={form.industry} onChange={e => set('industry', e.target.value)}
              className="input" placeholder="e.g. Manufacturing" style={{ marginTop: 6 }}/>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="input" style={{ marginTop: 6 }}>
              <option value="active">Active</option>
              <option value="prospect">Prospect</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Client Colour</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => set('color', c)}
                style={{
                  width: 28, height: 28, borderRadius: '50%', background: c,
                  border: form.color === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                  cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                {form.color === c && (
                  <svg viewBox="0 0 16 16" fill="none" style={{ width: 12, height: 12 }}>
                    <path d="M13 4L6.5 11 3 7.5" stroke="white" strokeWidth="2.2"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Internal Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={3} className="input"
            placeholder="Filing notes, special instructions..."
            style={{ marginTop: 6, resize: 'none' }}/>
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button type="submit" disabled={saving} className="btn btn-brand" style={{ flex: 1 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => router.push(`/clients/${client.id}`)} className="btn btn-outline">
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}
