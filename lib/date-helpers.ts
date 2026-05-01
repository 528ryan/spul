const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const MONTHS_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

export function currentMes(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** Returns start/end date strings (YYYY-MM-DD) and ISO timestamps for a given month. */
export function getMonthRange(mes: string) {
  const [y, m] = mes.split('-').map(Number)
  const start = `${mes}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${mes}-${String(lastDay).padStart(2, '0')}`
  // ISO for timestamptz columns — use exclusive upper bound (start of next month)
  const startISO = new Date(y, m - 1, 1).toISOString()
  const endISO = new Date(y, m, 1).toISOString() // exclusive
  return { start, end, startISO, endISO }
}

/** Returns the YYYY-MM-01 date string of the month 6 positions back (inclusive start for 6-month window). */
export function sixMonthsStartDate(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 6, 1) // 5 months before = 6 months total including current
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function sixMonthsStartISO(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  return new Date(y, m - 6, 1).toISOString()
}

/** Returns an array of 6 YYYY-MM strings ending at (and including) mes. */
export function getLast6Months(mes: string): string[] {
  const [y, m] = mes.split('-').map(Number)
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(y, m - 1 - (5 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

export function getPreviousMonth(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** "Mar 2026" */
export function formatMonthLabel(mes: string): string {
  const [, m] = mes.split('-').map(Number)
  return `${MONTHS_SHORT[m - 1]} ${mes.split('-')[0]}`
}

/** "Março de 2026" */
export function formatMonthFull(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  return `${MONTHS_PT[m - 1]} de ${y}`
}

/** Short label for chart axes: "Mar" */
export function formatMonthShort(mes: string): string {
  const [, m] = mes.split('-').map(Number)
  return MONTHS_SHORT[m - 1]
}

/** "14 mar" */
export function formatShortDate(date: string): string {
  const d = date.includes('T') ? new Date(date) : new Date(date + 'T00:00:00')
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()].toLowerCase()}`
}

/** "14/03 15:22" — sempre em America/Sao_Paulo (BRT/BRST) */
export function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

/**
 * Formata uma string timestamptz em "dd/mm hh:mm" no fuso de São Paulo.
 * Use para exibir datas/horas de pedidos e lançamentos.
 */
export function formatDateBRT(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

/**
 * Retorna "YYYY-MM-DDTHH:MM" ajustado para BRT (UTC-3),
 * para uso como valor default em inputs datetime-local.
 */
export function getNowBRT(): string {
  const now = new Date()
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  return brt.toISOString().slice(0, 16)
}
