const sizeMap = {
  sm: 'w-3.5 h-3.5 border-[1.5px]',
  md: 'w-4 h-4 border-2',
  lg: 'w-6 h-6 border-2',
} as const

interface SpinnerProps {
  size?: keyof typeof sizeMap
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className={[
        'inline-block rounded-full border-current border-r-transparent animate-spin',
        sizeMap[size],
        className ?? '',
      ].join(' ')}
    />
  )
}
