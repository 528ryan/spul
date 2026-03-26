import type { ReactNode } from 'react'

interface KpiCardProps {
  label: string
  value: string
  delta?: number
  icon?: ReactNode
  className?: string
  /** Hero variant — KPI principal (Saldo). Ocupa 2 colunas, valor maior em heading font. */
  primary?: boolean
}

export function KpiCard({ label, value, delta, icon, className, primary = false }: KpiCardProps) {
  return (
    <div
      className={[
        'flex flex-col gap-2 rounded-xl p-5',
        primary
          ? 'bg-surface-2 border border-accent/20 col-span-2'
          : 'bg-surface border border-border',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center justify-between">
        <span className="label-eyebrow text-[11px] font-medium uppercase text-muted">
          {label}
        </span>
        {icon && <span className="text-muted">{icon}</span>}
      </div>

      <span
        className={[
          'kpi-value leading-none text-text tabular-nums',
          primary
            ? 'text-[32px] font-bold font-heading'
            : 'text-[20px] font-semibold',
        ].join(' ')}
      >
        {value}
      </span>

      {delta !== undefined && (
        <span
          className={[
            'text-xs font-medium tabular-nums flex items-center gap-1',
            delta >= 0 ? 'text-success' : 'text-danger',
          ].join(' ')}
        >
          {delta >= 0 ? '↑' : '↓'}
          {delta >= 0 ? '+' : ''}
          {delta.toFixed(1)}% vs mês anterior
        </span>
      )}
    </div>
  )
}
