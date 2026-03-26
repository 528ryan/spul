'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

interface ShellProps {
  children: React.ReactNode
  userEmail: string
}

export function Shell({ children, userEmail }: ShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()

  // Close drawer on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen bg-bg flex">
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <div className="hidden lg:flex lg:flex-col w-[220px] shrink-0 h-screen sticky top-0">
        <Sidebar userEmail={userEmail} />
      </div>

      {/* ── Mobile overlay ──────────────────────────────── */}
      <div
        aria-hidden={!isMobileOpen}
        className={[
          'fixed inset-0 z-30 bg-bg/70 backdrop-blur-sm lg:hidden transition-opacity duration-200',
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* ── Mobile drawer ───────────────────────────────── */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-40 h-full lg:hidden transition-transform duration-300',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
      >
        <Sidebar userEmail={userEmail} onNavigate={() => setIsMobileOpen(false)} />
      </div>

      {/* ── Main content ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar userEmail={userEmail} onMenuClick={() => setIsMobileOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
