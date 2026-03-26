import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KpiCard } from '@/components/ui'
import { MesSeletor } from '@/components/dashboard/MesSeletor'
import { formatCurrency } from '@/lib/utils'
import { PLATFORM_LABELS } from '@/lib/types'
import type { Transaction } from '@/lib/types'

// ── helpers ───────────────────────────────────────────────────────────────

type TxSlim = Pick<Transaction, 'type' | 'amount' | 'date' | 'platform' | 'category_name'>

function currentMes(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function dateToYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function mesStart(mes: string): string {
  return `${mes}-01`
}

function mesEnd(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  return dateToYMD(new Date(y, m, 1))
}

function prevMes(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function sixMonthsStart(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  return dateToYMD(new Date(y, m - 6, 1))
}

function filterByRange(txs: TxSlim[], start: string, end: string): TxSlim[] {
  return txs.filter((t) => t.date >= start && t.date < end)
}

function sumType(txs: TxSlim[], type: 'entrada' | 'saida'): number {
  return txs.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0)
}

function buildChart(
  allTxs: TxSlim[],
  mes: string,
): { mes: string; label: string; entradas: number; saidas: number }[] {
  const [y, m] = mes.split('-').map(Number)
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(y, m - 1 - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const txs = filterByRange(allTxs, mesStart(key), mesEnd(key))
    return {
      mes: key,
      label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      entradas: sumType(txs, 'entrada'),
      saidas: sumType(txs, 'saida'),
    }
  })
}

function groupByCategory(txs: TxSlim[], type: 'entrada' | 'saida') {
  const map = new Map<string, number>()
  for (const t of txs) {
    if (t.type !== type) continue
    map.set(t.category_name, (map.get(t.category_name) ?? 0) + t.amount)
  }
  return [...map.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
}

function groupByPlatform(txs: TxSlim[]) {
  const map = new Map<string, number>()
  for (const t of txs) {
    if (t.type !== 'entrada' || !t.platform) continue
    map.set(t.platform, (map.get(t.platform) ?? 0) + t.amount)
  }
  return [...map.entries()]
    .map(([platform, total]) => ({ platform, total }))
    .sort((a, b) => b.total - a.total)
}

// ── page ──────────────────────────────────────────────────────────────────

export default async function RelatorioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { mes: mesParam } = await searchParams
  const mes = mesParam ?? currentMes()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sixStart   = sixMonthsStart(mes)
  const mesEndDate = mesEnd(mes)
  const prev       = prevMes(mes)

  const [sixMonthResult, prevMonthResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('type, amount, date, platform, category_name')
      .eq('user_id', user.id)
      .gte('date', sixStart)
      .lt('date', mesEndDate)
      .order('date', { ascending: true }),

    supabase
      .from('transactions')
      .select('type, amount, date, platform, category_name')
      .eq('user_id', user.id)
      .gte('date', mesStart(prev))
      .lt('date', mesEnd(prev)),
  ])

  const allTxs  = (sixMonthResult.data ?? []) as TxSlim[]
  const prevTxs = (prevMonthResult.data ?? []) as TxSlim[]

  const currTxs = filterByRange(allTxs, mesStart(mes), mesEnd(mes))

  const currEntradas = sumType(currTxs, 'entrada')
  const currSaidas   = sumType(currTxs, 'saida')
  const currSaldo    = currEntradas - currSaidas
  const currMargem   = currEntradas > 0 ? (currSaldo / currEntradas) * 100 : 0

  const prevEntradas = sumType(prevTxs, 'entrada')
  const prevSaidas   = sumType(prevTxs, 'saida')
  const prevSaldo    = prevEntradas - prevSaidas
  const prevMargem   = prevEntradas > 0 ? (prevSaldo / prevEntradas) * 100 : 0

  const chart    = buildChart(allTxs, mes)
  const chartMax = Math.max(...chart.flatMap((c) => [c.entradas, c.saidas]), 1)

  const saiByCat  = groupByCategory(currTxs, 'saida')
  const saiTotal  = saiByCat.reduce((s, c) => s + c.total, 0)

  const platData  = groupByPlatform(currTxs)
  const platTotal = platData.reduce((s, p) => s + p.total, 0)

  const hasPrevData = prevEntradas > 0 || prevSaidas > 0

  function varPct(curr: number, prev: number): number | null {
    if (prev === 0) return null
    return ((curr - prev) / prev) * 100
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-text">Relatório</h1>
        <MesSeletor currentMes={mes} />
      </div>

      {/* Hero — Lucro líquido */}
      <div className="bg-success-dim border border-success/30 rounded-xl p-6">
        <p className="label-eyebrow text-[10px] font-medium uppercase text-success/70 mb-2">
          Lucro líquido
        </p>
        <p className="kpi-value text-[32px] font-bold text-success leading-none tabular-nums">
          {formatCurrency(currSaldo)}
        </p>
        <p className="text-sm text-success/70 mt-2">
          Margem {currMargem.toFixed(1)}%
          {currEntradas === 0 && ' — sem receitas'}
        </p>
      </div>

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          label="Entradas"
          value={formatCurrency(currEntradas)}
          icon={<IconArrowUp />}
        />
        <KpiCard
          label="Saídas"
          value={formatCurrency(currSaidas)}
          icon={<IconArrowDown />}
        />
        <KpiCard
          label="Margem"
          value={`${currMargem.toFixed(1)}%`}
          icon={<IconPercent />}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* Gráfico 6 meses */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text">Evolução 6 meses</h2>
          <div className="flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success/60 inline-block" />
              Entradas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-danger/60 inline-block" />
              Saídas
            </span>
          </div>
        </div>
        {chart.every((c) => c.entradas === 0 && c.saidas === 0) ? (
          <p className="text-sm text-muted py-8 text-center">Sem dados para exibir</p>
        ) : (
          <div className="flex items-end gap-2">
            {chart.map(({ mes: mKey, label, entradas, saidas }) => {
              const eH = entradas > 0 ? Math.max(Math.round((entradas / chartMax) * 120), 3) : 0
              const sH = saidas > 0 ? Math.max(Math.round((saidas / chartMax) * 120), 3) : 0
              return (
                <div key={mKey} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center gap-0.5 h-[120px]">
                    <div
                      style={{ height: `${eH}px` }}
                      className={['flex-1 rounded-t transition-colors', mKey === mes ? 'bg-success/70' : 'bg-success/40'].join(' ')}
                      title={`Entradas ${label}: ${formatCurrency(entradas)}`}
                    />
                    <div
                      style={{ height: `${sH}px` }}
                      className={['flex-1 rounded-t transition-colors', mKey === mes ? 'bg-danger/70' : 'bg-danger/40'].join(' ')}
                      title={`Saídas ${label}: ${formatCurrency(saidas)}`}
                    />
                  </div>
                  <span className={['text-[10px] capitalize', mKey === mes ? 'text-accent' : 'text-muted'].join(' ')}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Saídas por categoria + Entradas por plataforma */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Saídas por categoria */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-text mb-4">Saídas por categoria</h2>
          {saiByCat.length === 0 ? (
            <p className="text-sm text-muted">Sem saídas este mês.</p>
          ) : (
            <div className="space-y-3">
              {saiByCat.map(({ name, total }) => (
                <div key={name}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted">{name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted">{saiTotal > 0 ? ((total / saiTotal) * 100).toFixed(0) : 0}%</span>
                      <span className="text-danger tabular-nums font-medium">{formatCurrency(total)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-danger/50 rounded-full"
                      style={{ width: `${saiTotal > 0 ? (total / saiTotal) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Entradas por plataforma */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-text mb-4">Entradas por plataforma</h2>
          {platData.length === 0 ? (
            <p className="text-sm text-muted">Sem receitas por plataforma este mês.</p>
          ) : (
            <div className="space-y-3">
              {platData.map(({ platform, total }) => (
                <div key={platform}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted">{PLATFORM_LABELS[platform] ?? platform}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted">{platTotal > 0 ? ((total / platTotal) * 100).toFixed(0) : 0}%</span>
                      <span className="text-success tabular-nums font-medium">{formatCurrency(total)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success/50 rounded-full"
                      style={{ width: `${platTotal > 0 ? (total / platTotal) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comparativo mês anterior */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-text mb-4">Comparativo mês anterior</h2>
        {!hasPrevData ? (
          <p className="text-sm text-muted">Sem dados do mês anterior.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted uppercase tracking-wide border-b border-border">
                  <th className="text-left pb-3 font-medium"></th>
                  <th className="text-right pb-3 font-medium">Entradas</th>
                  <th className="text-right pb-3 font-medium">Saídas</th>
                  <th className="text-right pb-3 font-medium">Saldo</th>
                  <th className="text-right pb-3 font-medium">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-3 text-text font-medium">Este mês</td>
                  <td className="py-3 text-right text-success tabular-nums">{formatCurrency(currEntradas)}</td>
                  <td className="py-3 text-right text-danger tabular-nums">{formatCurrency(currSaidas)}</td>
                  <td className={['py-3 text-right tabular-nums font-semibold', currSaldo >= 0 ? 'text-success' : 'text-danger'].join(' ')}>
                    {formatCurrency(currSaldo)}
                  </td>
                  <td className="py-3 text-right text-text tabular-nums">{currMargem.toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="py-3 text-muted">Mês anterior</td>
                  <td className="py-3 text-right text-muted tabular-nums">{formatCurrency(prevEntradas)}</td>
                  <td className="py-3 text-right text-muted tabular-nums">{formatCurrency(prevSaidas)}</td>
                  <td className="py-3 text-right text-muted tabular-nums">{formatCurrency(prevSaldo)}</td>
                  <td className="py-3 text-right text-muted tabular-nums">{prevMargem.toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="py-3 text-[10px] text-muted uppercase tracking-wide">Variação</td>
                  <td className="py-3 text-right">
                    <VarBadge pct={varPct(currEntradas, prevEntradas)} />
                  </td>
                  <td className="py-3 text-right">
                    <VarBadge pct={varPct(currSaidas, prevSaidas)} invert />
                  </td>
                  <td className="py-3 text-right">
                    <VarBadge pct={varPct(currSaldo, prevSaldo)} />
                  </td>
                  <td className="py-3 text-right">
                    <VarBadge pct={varPct(currMargem, prevMargem)} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── sub-components ────────────────────────────────────────────────────────

function VarBadge({ pct, invert = false }: { pct: number | null; invert?: boolean }) {
  if (pct === null) return <span className="text-xs text-muted">—</span>
  const positive = invert ? pct < 0 : pct >= 0
  return (
    <span className={['text-xs font-medium tabular-nums', positive ? 'text-success' : 'text-danger'].join(' ')}>
      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

function IconArrowUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  )
}

function IconArrowDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  )
}

function IconPercent() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  )
}
