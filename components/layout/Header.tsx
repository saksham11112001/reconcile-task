'use client'
import { Menu } from 'lucide-react'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useAppStore } from '@/store/appStore'

interface HeaderProps { title: string }

export function Header({ title }: HeaderProps) {
  const { setSidebarOpen, sidebarOpen } = useAppStore()

  return (
    <header style={{ height: 52, flexShrink: 0, background: 'var(--surface)',
      borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center',
      padding: '0 1.25rem', gap: 12 }}>

      {/* Mobile hamburger — shown via CSS at ≤768px */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{ background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', padding: 4 }}
        className="mobile-menu-btn">
        <Menu style={{ width: 20, height: 20 }}/>
      </button>

      <h1 style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
        {title}
      </h1>

      <ThemeToggle />
    </header>
  )
}
