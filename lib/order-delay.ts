export type DelayLevel = 'ok' | 'warning' | 'alert' | 'critical'

export interface DelayInfo {
  level: DelayLevel
  hoursElapsed: number
  label: string
  colorClass: string
  borderClass: string
}

export function getOrderDelay(orderedAt: string | null): DelayInfo | null {
  if (!orderedAt) return null

  const now = new Date()
  const ordered = new Date(orderedAt)
  const diffMs = now.getTime() - ordered.getTime()
  const hoursElapsed = diffMs / (1000 * 60 * 60)

  const days = Math.floor(hoursElapsed / 24)
  const hours = Math.floor(hoursElapsed % 24)
  const label = days > 0
    ? `${days}d ${hours}h de atraso`
    : `${Math.floor(hoursElapsed)}h de atraso`

  if (hoursElapsed < 24) {
    return {
      level: 'ok',
      hoursElapsed,
      label: '',
      colorClass: '',
      borderClass: 'border-border',
    }
  } else if (hoursElapsed < 36) {
    return {
      level: 'warning',
      hoursElapsed,
      label,
      colorClass: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      borderClass: 'border-yellow-500/40',
    }
  } else if (hoursElapsed < 48) {
    return {
      level: 'alert',
      hoursElapsed,
      label,
      colorClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      borderClass: 'border-orange-500/40',
    }
  } else {
    return {
      level: 'critical',
      hoursElapsed,
      label,
      colorClass: 'bg-danger/10 text-danger border-danger/30',
      borderClass: 'border-danger/40',
    }
  }
}
