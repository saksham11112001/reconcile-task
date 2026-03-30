'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users2, GitCompare, RefreshCw,
  Settings, User, LogOut, FileSearch, UserCheck,
  FileBarChart2, CreditCard, Palette, Building2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { initials } from '@/lib/utils/format'

interface SidebarProps {
  orgName:  string
  userName: string
}

export function Sidebar({ orgName, userName }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const { sidebarOpen } = useAppStore()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <div style={{ width: 'var(--sidebar-w)', height: '100%', background: 'var(--surface)',
      borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      flexShrink: 0 }}>

      {/* Logo */}
      <div style={{ padding: '1.1rem 1.25rem', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: '#0d9488',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <GitCompare style={{ width: 16, height: 16, color: '#fff' }}/>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Reconcile
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 160 }}>
            {orgName}
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.5rem', overflowY: 'auto' }}>

        <NavLabel>Main</NavLabel>
        <NavLink href="/dashboard" active={isActive('/dashboard', true)}>
          <LayoutDashboard style={{ width: 16, height: 16 }}/>
          Dashboard
        </NavLink>
        <NavLink href="/clients" active={isActive('/clients')}>
          <Users2 style={{ width: 16, height: 16 }}/>
          Clients
        </NavLink>

        <NavLabel style={{ marginTop: '0.6rem' }}>Reconciliations</NavLabel>
        <NavLink href="/reconciliations" active={
          isActive('/reconciliations') &&
          !isActive('/reconciliations/schedules') &&
          !isActive('/reconciliations/new') &&
          !isActive('/reconciliations/my')
        }>
          <GitCompare style={{ width: 16, height: 16 }}/>
          All Reconciliations
        </NavLink>
        <NavLink href="/reconciliations/my" active={isActive('/reconciliations/my')}>
          <UserCheck style={{ width: 16, height: 16 }}/>
          My Reconciliations
        </NavLink>
        <NavLink href="/reconciliations/schedules" active={isActive('/reconciliations/schedules')}>
          <RefreshCw style={{ width: 16, height: 16 }}/>
          Recurring Schedules
        </NavLink>
        <NavLink href="/doc-requests" active={isActive('/doc-requests')}>
          <FileSearch style={{ width: 16, height: 16 }}/>
          Document Requests
        </NavLink>
        <NavLink href="/reports" active={isActive('/reports')}>
          <FileBarChart2 style={{ width: 16, height: 16 }}/>
          Reports
        </NavLink>

        <NavLabel style={{ marginTop: '0.6rem' }}>Settings</NavLabel>
        <NavLink href="/settings" active={isActive('/settings', true)}>
          <Settings style={{ width: 16, height: 16 }}/>
          Settings
        </NavLink>
        <NavLink href="/settings/organisation" active={isActive('/settings/organisation')}>
          <Building2 style={{ width: 16, height: 16 }}/>
          Organisation
        </NavLink>
        <NavLink href="/settings/members" active={isActive('/settings/members')}>
          <User style={{ width: 16, height: 16 }}/>
          Team Members
        </NavLink>
        <NavLink href="/settings/billing" active={isActive('/settings/billing')}>
          <CreditCard style={{ width: 16, height: 16 }}/>
          Billing & Plan
        </NavLink>
        <NavLink href="/settings/appearance" active={isActive('/settings/appearance')}>
          <Palette style={{ width: 16, height: 16 }}/>
          Appearance
        </NavLink>
      </nav>

      {/* User footer */}
      <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#0d9488',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          {initials(userName)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userName}
          </div>
        </div>
        <button onClick={handleSignOut} title="Sign out"
          style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 4, borderRadius: 5,
            display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <LogOut style={{ width: 15, height: 15 }}/>
        </button>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────

function NavLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.06em', color: 'var(--text-muted)',
      padding: '0.4rem 0.75rem 0.3rem', ...style }}>
      {children}
    </div>
  )
}

function NavLink({ href, active, children }: {
  href:     string
  active:   boolean
  children: React.ReactNode
}) {
  return (
    <Link href={href}
      style={{ display: 'flex', alignItems: 'center', gap: 9,
        padding: '0.48rem 0.75rem', borderRadius: 7, marginBottom: 1,
        fontSize: 13.5, fontWeight: 500, textDecoration: 'none',
        color:      active ? 'var(--brand)' : 'var(--text-secondary)',
        background: active ? 'var(--brand-light)' : 'transparent',
        transition: 'background 0.12s, color 0.12s',
      }}>
      {children}
    </Link>
  )
}
