const variantMap = {
  accent:  'bg-accent-muted  text-accent',
  success: 'bg-success-dim   text-success',
  danger:  'bg-danger-dim    text-danger',
  warning: 'bg-warning/10    text-warning',
  muted:   'bg-surface-2 border border-border text-muted',
} as const

interface BadgeProps {
  variant?: keyof typeof variantMap
  dot?: boolean
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'muted', dot = false, children, className }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        variantMap[variant],
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />
      )}
      {children}
    </span>
  )
}
