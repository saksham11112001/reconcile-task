export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import type { ReactNode } from 'react'

export default async function OrganisationSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members')
    .select('org_id, role, organisations(id, name, billing_email)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  if (!mb) redirect('/onboarding')

  const org = mb.organisations as unknown as { id: string; name: string; billing_email: string | null } | null
  if (!org) redirect('/onboarding')

  const isOwnerOrAdmin = ['owner', 'admin'].includes(mb.role)

  return (
    <div className="app-content">
      <Header title="Organisation" />
      <div className="page-container">
        <div className="card" style={{ padding: '1.5rem 2rem', maxWidth: 500 }}>
          <h2 style={{ margin: '0 0 1.25rem', fontSize: 15, fontWeight: 700,
            color: 'var(--text-primary)' }}>
            Organisation Details
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <InfoField label="Name" value={org.name} />
            <InfoField label="Billing email" value={org.billing_email ?? '—'} />
            <InfoField label="Your role"
              value={
                <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4,
                  background: 'var(--surface-subtle)', color: 'var(--text-secondary)',
                  border: '1px solid var(--border)', fontWeight: 500 }}>
                  {mb.role}
                </span>
              }
            />
          </div>

          {isOwnerOrAdmin && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem',
              borderTop: '1px solid var(--border)' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                To update your organisation name or billing email, contact support or update
                directly in your Supabase project's{' '}
                <code style={{ fontSize: 12, background: 'var(--surface-subtle)',
                  padding: '1px 5px', borderRadius: 3, border: '1px solid var(--border)' }}>
                  organisations
                </code>{' '}
                table.
              </p>
            </div>
          )}
        </div>
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
      <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}
