'use client'

import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':   'Visão geral',
  '/lancamentos': 'Lançamentos',
  '/relatorio':   'Relatório',
  '/produtos':    'Produtos',
  '/producao':    'Produção',
}

interface TopbarProps {
  userEmail: string
  onMenuClick: () => void
}

export function Topbar({ userEmail, onMenuClick }: TopbarProps) {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ?? ''
  const initial = (userEmail[0] ?? '?').toUpperCase()

  return (
    <header className="h-[52px] bg-surface border-b border-border flex items-center px-4 gap-3 shrink-0">
      {/* Hamburger — mobile only */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Abrir menu"
        className="lg:hidden text-muted hover:text-text transition-colors"
      >
        <IconMenu />
      </button>

      {/* Page title */}
      <span className="flex-1 text-sm font-medium text-text">{title}</span>

      {/* User avatar */}
      <div
        className="w-7 h-7 rounded-full bg-accent-muted text-accent text-xs font-semibold flex items-center justify-center shrink-0"
        title={userEmail}
        aria-label={`Usuário: ${userEmail}`}
      >
        {initial}
      </div>
    </header>
  )
}

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
