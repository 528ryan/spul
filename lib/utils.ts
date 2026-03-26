import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(
    typeof date === 'string' ? new Date(date) : date,
  )
}

export function formatDateTime(dt: string | Date): string {
  const d = typeof dt === 'string' ? new Date(dt) : dt
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}
