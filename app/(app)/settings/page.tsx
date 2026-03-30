export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import Link             from 'next/link'
import {
  Building2, Users2, Palette, CreditCard, ChevronRight,
} from 'lucide-react'

const SECTIONS = [
  {
    href:  '/settings/organisation',
    icon:  Building2,
    color: '#0d9488',
    bg:    '#f0fdfa',
    title: 'Organisation',
    desc:  'Edit your firm name, billing email, and branding.',
  },
  {
    href:  '/settings/members',
    icon:  Users2,
    color: '#1d4ed8',
    bg:    '#eff6ff',
    title: 'Team Members',
    desc:  'Invite team members, manage roles and permissions.',
  },
  {
    href:  '/settings/billing',
    icon:  CreditCard,
    color: '#7c3aed',
    bg:    '#f5f3ff',
    title: 'Billing & Plan',
    desc:  'View your current plan, upgrade or manage subscription.',
  },
  {
    href:  '/settings/appearance',
    icon:  Palette,
    color: '#0891b2',
    bg:    '#ecfeff',
    title: 'Appearance',
    desc:  'Switch between light, dark, or system theme.',
  },
]

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members').select('org_id, role')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb) redirect('/onboarding')

  return (
    <div className="app-content">
      <Header title="Settings" />
      <div className="page-container">
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            Settings
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Manage your organisation, team, and preferences.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {SECTIONS.map(s => {
            const Icon = s.icon
            return (
              <Link key={s.href} href={s.href}
                style={{ textDecoration: 'none', display: 'block' }}>
                <div className="card" style={{ padding: '1.25rem 1.5rem',
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  transition: 'box-shadow 0.15s, border-color 0.15s' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10,
                    background: s.bg, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0 }}>
                    <Icon style={{ width: 18, height: 18, color: s.color }}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {s.title}
                      <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-muted)' }}/>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 }}>
                      {s.desc}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
