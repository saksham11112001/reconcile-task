'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router  = useRouter()
  const [name,    setName]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })

    setLoading(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Something went wrong.')
      return
    }

    router.replace('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-subtle)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Set up your organisation
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 14 }}>
            You can invite your team after setup.
          </p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500,
              color: 'var(--text-secondary)', marginBottom: 6 }}>
              Organisation name
            </label>
            <input
              className="input"
              type="text"
              required
              placeholder="e.g. SNG Advisers"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ marginBottom: '1.25rem' }}
            />

            {error && (
              <p style={{ color: '#dc2626', fontSize: 13, marginBottom: '0.85rem' }}>{error}</p>
            )}

            <button type="submit" className="btn btn-brand btn-lg" disabled={loading || !name.trim()}
              style={{ width: '100%' }}>
              {loading ? 'Creating…' : 'Create organisation'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
