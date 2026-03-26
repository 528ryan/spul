'use client'

import { useTransition } from 'react'
import { NavLinks, IconGrid, IconArrows, IconBarChart, IconCubeSmall, IconKanban } from './NavLinks'
import { Badge } from '@/components/ui/Badge'
import { signOut } from '@/app/actions/auth'

interface SidebarProps {
  userEmail: string
  onNavigate?: () => void
}

const NAV_SECTIONS = [
  {
    label: 'GERAL',
    items: [
      { href: '/dashboard',   label: 'Dashboard',    icon: <IconGrid /> },
      { href: '/lancamentos', label: 'Lançamentos',  icon: <IconArrows /> },
    ],
  },
  {
    label: 'ANÁLISE',
    items: [
      { href: '/relatorio', label: 'Relatório', icon: <IconBarChart /> },
      { href: '/produtos',  label: 'Produtos',  icon: <IconCubeSmall /> },
    ],
  },
  {
    label: 'PRODUÇÃO',
    items: [
      { href: '/producao', label: 'Produção', icon: <IconKanban /> },
    ],
  },
  {
    label: 'CONTA',
    items: [
      { href: '/configuracoes', label: 'Configurações', icon: <IconGear /> },
    ],
  },
]

export function Sidebar({ userEmail, onNavigate }: SidebarProps) {
  const [isPending, startTransition] = useTransition()

  const initial = (userEmail[0] ?? '?').toUpperCase()
  const truncatedEmail =
    userEmail.length > 24 ? `${userEmail.slice(0, 24)}…` : userEmail

  function handleSignOut() {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <aside className="w-[220px] h-full bg-surface border-r border-border flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
        <span className="font-heading text-xl text-text" style={{ letterSpacing: '-0.03em' }}>
          sp<span className="text-accent">u</span>l
        </span>
        <Badge variant="accent">beta</Badge>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-2">
              {section.label}
            </p>
            <NavLinks items={section.items} onNavigate={onNavigate} />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-accent-muted text-accent text-xs font-semibold flex items-center justify-center shrink-0">
            {initial}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-text truncate" title={userEmail}>
              {truncatedEmail}
            </p>
          </div>

          {/* Sign out button */}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isPending}
            title="Sair"
            className="text-muted hover:text-text transition-colors disabled:opacity-50 shrink-0"
          >
            <IconSignOut />
          </button>
        </div>
      </div>
    </aside>
  )
}

function IconSignOut() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconGear() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
