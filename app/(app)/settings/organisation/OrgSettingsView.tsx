'use client'

import { useState }   from 'react'
import { useRouter }  from 'next/navigation'
import { toast }      from '@/store/appStore'
import { Pencil, X, Loader, Save } from 'lucide-react'
import type { ReactNode } from 'react'

interface Org { id: string; name: string; billing_email: string | null }

interface Props {
  org:     Org
  role:    string
  canEdit: boolean
}

export function OrgSettingsView({ org: initial, role, canEdit }: Props) {
  const router   = useRouter()
  const [org,      setOrg]      = useState<Org>(initial)
  const [editing,  setEditing]  = useState(false)
  const [name,     setName]     = useState(initial.name)
  const [billing,  setBilling]  = useState(initial.billing_email ?? '')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  function startEdit() {
    setName(org.name)
    setBilling(org.billing_email ?? '')
    setError(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setError(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Organisation name is required.'); return }
    setError(null)
    setSaving(true)

    const res = await fetch('/api/organisation', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: name.trim(), billing_email: billing.trim() }),
    })

    setSaving(false)

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Failed to save.')
      return
    }

    const updated = await res.json()
    setOrg(updated)
    setEditing(false)
    toast.success('Organisation updated.')
    router.refresh()
  }

  return (
    <div style={{ maxWidth: 500 }}>
      <div className="card" style={{ padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            Organisation Details
          </h2>
          {canEdit && !editing && (
            <button onClick={startEdit} className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Pencil style={{ width: 12, height: 12 }}/> Edit
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>
                Name *
              </label>
              <input className="input" type="text" required
                value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>
                Billing email
              </label>
              <input className="input" type="email"
                placeholder="billing@yourfirm.com"
                value={billing} onChange={e => setBilling(e.target.value)} />
            </div>
            {error && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={cancelEdit} className="btn btn-ghost btn-sm">
                <X style={{ width: 12, height: 12 }}/> Cancel
              </button>
              <button type="submit" disabled={saving} className="btn btn-brand btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {saving
                  ? <><Loader style={{ width: 12, height: 12 }} className="animate-spin"/> Saving…</>
                  : <><Save style={{ width: 12, height: 12 }}/> Save</>
                }
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <InfoField label="Name"          value={org.name} />
            <InfoField label="Billing email" value={org.billing_email ?? '—'} />
            <InfoField label="Your role"
              value={
                <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4,
                  background: 'var(--surface-subtle)', color: 'var(--text-secondary)',
                  border: '1px solid var(--border)', fontWeight: 500 }}>
                  {role}
                </span>
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}
