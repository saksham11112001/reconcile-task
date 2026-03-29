'use client'
import { useEffect } from 'react'
import { Sidebar }    from '@/components/layout/Sidebar'
import { useAppStore } from '@/store/appStore'
import type { ReactNode } from 'react'
import type { AppSession } from '@/types'

interface AppShellProps {
  children: ReactNode
  session:  AppSession
}

export function AppShell({ children, session }: AppShellProps) {
  const { setSession, sidebarOpen, setSidebarOpen } = useAppStore()

  useEffect(() => {
    setSession(session)
  }, [session, setSession])

  return (
    <div className="app-shell">
      {/* Mobile backdrop — clicking it closes the sidebar */}
      <div
        className="sidebar-backdrop"
        onClick={() => setSidebarOpen(false)}
      />
      <div className={`sidebar-wrapper${sidebarOpen ? ' open' : ''}`}>
        <Sidebar orgName={session.org.name} userName={session.user.name} />
      </div>
      <div className="app-main">
        {children}
      </div>
    </div>
  )
}
