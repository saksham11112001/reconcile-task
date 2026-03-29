export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  if (!mb) redirect('/onboarding')

  const { data: members } = await supabase
    .from('org_members')
    .select('id, role, users(name, email)')
    .eq('org_id', mb.org_id)
    .eq('is_active', true)
    .order('role')

  return (
    <div className="app-content">
      <Header title="Members" />
      <div className="page-container">
        <div className="card" style={{ overflow: 'hidden', maxWidth: 600 }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Team Members</h2>
            {['owner', 'admin'].includes(mb.role) && (
              <button className="btn btn-brand btn-sm">Invite Member</button>
            )}
          </div>
          <div>
            {(members ?? []).map((m: any) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12,
                padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {m.users?.name ?? '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {m.users?.email}
                  </div>
                </div>
                <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4,
                  background: 'var(--surface-subtle)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
