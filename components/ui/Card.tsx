import type { ReactNode } from 'react'

const paddingMap = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
} as const

interface CardProps {
  children: ReactNode
  padding?: keyof typeof paddingMap
  hover?: boolean
  className?: string
}

export function Card({ children, padding = 'md', hover = false, className }: CardProps) {
  return (
    <div
      className={[
        'bg-surface border border-border rounded-xl',
        paddingMap[padding],
        hover ? 'transition-colors duration-150 hover:border-border-2 cursor-pointer' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
