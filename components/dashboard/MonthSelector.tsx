'use client'

import { useRouter, usePathname } from 'next/navigation'

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return options
}

interface MonthSelectorProps {
  currentMonth: string
}

export function MonthSelector({ currentMonth }: MonthSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const options = getMonthOptions()

  return (
    <select
      value={currentMonth}
      onChange={(e) => router.push(`${pathname}?month=${e.target.value}`)}
      className="bg-surface-2 border border-border text-sm text-text rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors cursor-pointer"
    >
      {options.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  )
}
