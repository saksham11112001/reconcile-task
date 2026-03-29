'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ERROR_MESSAGES: Record<string, string> = {
  session_expired: 'Your session expired. Please sign in again.',
  auth_failed:     'Authentication failed. Please try again.',
  no_code:         'Invalid login link. Please request a new one.',
}

export default function LoginPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect') ?? '/dashboard'
  const urlError     = searchParams.get('error')

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(
    urlError ? (ERROR_MESSAGES[urlError] ?? 'Something went wrong.') : null
  )
  const [magicSent, setMagicSent] = useState(false)

  const supabase = createClient()

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.replace(redirectTo)
  }

  async function handleMagicLink() {
    if (!email) { setError('Enter your email first.'); return }
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setMagicSent(true)
  }

  async function handleGoogle() {
    setError(null)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#0d9488',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>R</span>
            </div>
            <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 22 }}>Reconcile</span>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 8 }}>
            Bank reconciliation for CA firms
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#1e2433', border: '1px solid #2d3748',
          borderRadius: 14, padding: '2rem' }}>

          {magicSent ? (
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <p style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 8 }}>Check your email</p>
              <p style={{ fontSize: 14 }}>We sent a login link to <strong style={{ color: '#f1f5f9' }}>{email}</strong></p>
            </div>
          ) : (
            <>
              {/* Google */}
              <button onClick={handleGoogle} className="btn btn-outline" style={{ width: '100%',
                marginBottom: '1.25rem', color: '#f1f5f9', borderColor: '#2d3748',
                background: '#252d3d' }}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
                <div style={{ flex: 1, height: 1, background: '#2d3748' }}/>
                <span style={{ color: '#64748b', fontSize: 12 }}>or</span>
                <div style={{ flex: 1, height: 1, background: '#2d3748' }}/>
              </div>

              {/* Email + Password */}
              <form onSubmit={handlePassword}>
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500,
                    color: '#94a3b8', marginBottom: 5 }}>Email</label>
                  <input className="input" type="email" required placeholder="you@firm.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    style={{ background: '#252d3d', borderColor: '#2d3748', color: '#f1f5f9' }}/>
                </div>
                <div style={{ marginBottom: '1.1rem' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500,
                    color: '#94a3b8', marginBottom: 5 }}>Password</label>
                  <input className="input" type="password" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)}
                    style={{ background: '#252d3d', borderColor: '#2d3748', color: '#f1f5f9' }}/>
                </div>

                {error && (
                  <p style={{ color: '#f87171', fontSize: 13, marginBottom: '0.85rem' }}>{error}</p>
                )}

                <button type="submit" className="btn btn-brand btn-lg" disabled={loading}
                  style={{ width: '100%' }}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <button onClick={handleMagicLink} disabled={loading}
                style={{ width: '100%', marginTop: '0.75rem', background: 'none', border: 'none',
                  color: '#64748b', fontSize: 13, cursor: 'pointer', padding: '0.4rem' }}>
                Send magic link instead
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
