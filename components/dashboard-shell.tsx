'use client'

import { Sidebar } from '@/components/sidebar'
import { useSettings } from '@/components/settings-context'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { sidebarHidden } = useSettings()

  return (
    <div
      className="app-shell min-h-screen flex"
      style={{ background: 'var(--app-bg)', color: 'var(--app-text)' }}
    >
      <Sidebar />

      <main
        className="flex-1 min-h-screen transition-all duration-200"
        style={{ marginLeft: sidebarHidden ? 'calc(60px + 24px)' : 'calc(16rem + 12px)' }}
      >
        {children}
      </main>
    </div>
  )
}
