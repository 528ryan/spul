'use client'

import { Spinner } from './Spinner'

const variantMap = {
  primary: [
    'bg-accent text-bg',
    'hover:opacity-90 hover:-translate-y-px',
    'active:translate-y-0 active:scale-[0.97]',
    'focus-visible:ring-accent/50',
  ].join(' '),
  ghost: [
    'border border-border text-text',
    'hover:bg-surface-2 hover:opacity-90',
    'active:scale-[0.97]',
    'focus-visible:ring-border',
  ].join(' '),
  danger: [
    'bg-danger-dim text-danger',
    'hover:bg-danger/20 hover:opacity-90',
    'active:scale-[0.97]',
    'focus-visible:ring-danger/40',
  ].join(' '),
} as const

const sizeMap = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-lg gap-2',
  lg: 'px-5 py-3 text-base rounded-lg gap-2',
} as const

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantMap
  size?: keyof typeof sizeMap
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-medium cursor-pointer',
        'transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        'disabled:translate-y-0 disabled:scale-100',
        variantMap[variant],
        sizeMap[size],
        fullWidth ? 'w-full' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
