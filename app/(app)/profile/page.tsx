export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, email, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="app-content">
      <Header title="Profile" />
      <div className="page-container">
        <div className="card" style={{ padding: '1.5rem', maxWidth: 440 }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: 15, fontWeight: 700 }}>Your Profile</h2>
          <div style={{ marginBottom: '0.85rem' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</label>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-primary)' }}>
              {profile?.name ?? '—'}
            </p>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-primary)' }}>
              {profile?.email ?? user.email ?? '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
