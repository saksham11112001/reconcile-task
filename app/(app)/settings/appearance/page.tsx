export const dynamic = 'force-dynamic'

import { Header }      from '@/components/layout/Header'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

export default function AppearancePage() {
  return (
    <div className="app-content">
      <Header title="Appearance" />
      <div className="page-container">
        <div className="card" style={{ padding: '1.5rem', maxWidth: 420 }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: 15, fontWeight: 700 }}>Theme</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Toggle between light, dark, and system theme
            </span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  )
}
