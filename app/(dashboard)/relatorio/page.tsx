import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KpiCard } from '@/components/ui'
import { MesSeletor } from '@/components/dashboard/MesSeletor'
import { RelatorioChart } from '@/components/relatorio/RelatorioChart'
import { SkuRankingPanel } from '@/components/relatorio/SkuRankingPanel'
import { ExportButtons } from '@/components/relatorio/ExportButtons'
import { formatCurrency } from '@/lib/utils'
import { PLATFORM_LABELS } from '@/lib/types'
import type { Transaction } from '@/lib/types'
import {
  currentMes,
  getMonthRange,
  getPreviousMonth,
  getLast6Months,
  sixMonthsStartDate,
  sixMonthsStartISO,
  formatMonthFull,
  formatMonthShort,
} from '@/lib/date-helpers'
import type { ChartMes } from '@/components/relatorio/RelatorioChart'
import type { SkuByRevenue, SkuByVolume } from '@/components/relatorio/SkuRankingPanel'

// ── Types ──────────────────────────────────────────────────────────────────

type TxSlim = Pick<Transaction, 'type' | 'amount' | 'date' | 'platform' | 'category_name' | 'sku'>

interface OrderItem {
  sku: string
  quantity: number
}

interface OrderSlim {
  id: string
  platform: string | null
  ordered_at: string | null
  order_items: OrderItem[]
}

interface Order6Slim {
  ordered_at: string | null
}

interface ProductSlim {
  sku: string
  name: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function sumType(txs: TxSlim[], type: 'entrada' | 'saida'): number {
  return txs.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0)
}

function filterByDateRange(txs: TxSlim[], start: string, end: string): TxSlim[] {
  return txs.filter((t) => t.date >= start && t.date <= end)
}

function varPct(curr: number, prev: number): number | null {
  if (prev === 0) return null
  return ((curr - prev) / prev) * 100
}

function buildChartData(
  allTxs: TxSlim[],
  orders6: Order6Slim[],
  mes: string,
): ChartMes[] {
  const months = getLast6Months(mes)
  return months.map((m) => {
    const [y, mo] = m.split('-').map(Number)
    const start = `${m}-01`
    const lastDay = new Date(y, mo, 0).getDate()
    const end = `${m}-${String(lastDay).padStart(2, '0')}`
    const txs = filterByDateRange(allTxs, start, end)

    // Count orders whose ordered_at falls within this month
    const mStart = new Date(y, mo - 1, 1)
    const mEnd = new Date(y, mo, 1)
    const pedidos = orders6.filter((o) => {
      if (!o.ordered_at) return false
      const d = new Date(o.ordered_at)
      return d >= mStart && d < mEnd
    }).length

    return {
      mes: m,
      label: formatMonthShort(m),
      entradas: sumType(txs, 'entrada'),
      saidas: sumType(txs, 'saida'),
      pedidos,
    }
  })
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

function buildSkuByRevenue(txs: TxSlim[], productMap: Map<string, string>): SkuByRevenue[] {
  const map = new Map<string, number>()
  for (const t of txs) {
    if (t.type !== 'entrada' || !t.sku) continue
    map.set(t.sku, (map.get(t.sku) ?? 0) + t.amount)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([sku, revenue]) => ({ sku, name: productMap.get(sku) ?? null, revenue }))
}

function buildSkuByVolume(orders: OrderSlim[], productMap: Map<string, string>): SkuByVolume[] {
  const map = new Map<string, number>()
  for (const order of orders) {
    for (const item of order.order_items) {
      map.set(item.sku, (map.get(item.sku) ?? 0) + item.quantity)
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([sku, quantity]) => ({ sku, name: productMap.get(sku) ?? null, quantity }))
}

// ── Page ───────────────────────────────────────────────────────────────────

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

  const range = getMonthRange(mes)
  const prevMes = getPreviousMonth(mes)
  const prevRange = getMonthRange(prevMes)
  const sixStart = sixMonthsStartDate(mes)
  const sixStartISO = sixMonthsStartISO(mes)

  const [
    txMesResult,
    txPrevResult,
    tx6MesesResult,
    ordersMesResult,
    orders6Result,
    productsResult,
  ] = await Promise.all([
    // 1. Transactions do mês selecionado
    supabase
      .from('transactions')
      .select('type, amount, date, platform, category_name, sku')
      .eq('user_id', user.id)
      .gte('date', range.start)
      .lte('date', range.end),

    // 2. Transactions do mês anterior
    supabase
      .from('transactions')
      .select('type, amount, date, platform, category_name, sku')
      .eq('user_id', user.id)
      .gte('date', prevRange.start)
      .lte('date', prevRange.end),

    // 3. Últimos 6 meses (gráfico evolução)
    supabase
      .from('transactions')
      .select('date, type, amount, platform, category_name, sku')
      .eq('user_id', user.id)
      .gte('date', sixStart),

    // 4. Orders do mês com items (para SKU analytics)
    supabase
      .from('orders')
      .select('id, platform, ordered_at, order_items(sku, quantity)')
      .eq('user_id', user.id)
      .gte('ordered_at', range.startISO)
      .lt('ordered_at', range.endISO)
      .not('ordered_at', 'is', null),

    // 5. Orders últimos 6 meses (gráfico modo Pedidos)
    supabase
      .from('orders')
      .select('ordered_at')
      .eq('user_id', user.id)
      .gte('ordered_at', sixStartISO)
      .lt('ordered_at', range.endISO)
      .not('ordered_at', 'is', null),

    // 6. Catálogo de produtos (para nome dos SKUs)
    supabase
      .from('products')
      .select('sku, name')
      .eq('user_id', user.id),
  ])

  const txMes = (txMesResult.data ?? []) as TxSlim[]
  const txPrev = (txPrevResult.data ?? []) as TxSlim[]
  const tx6 = (tx6MesesResult.data ?? []) as TxSlim[]
  const ordersMes = (ordersMesResult.data ?? []) as OrderSlim[]
  const orders6 = (orders6Result.data ?? []) as Order6Slim[]
  const products = (productsResult.data ?? []) as ProductSlim[]

  const productMap = new Map(products.map((p) => [p.sku, p.name]))

  // ── KPIs ──

  const receita = sumType(txMes, 'entrada')
  const saidas = sumType(txMes, 'saida')
  const saldo = receita - saidas
  const margem = receita > 0 ? (saldo / receita) * 100 : 0

  const pedidosMes = ordersMes.length
  const ticketMedio = pedidosMes > 0 ? receita / pedidosMes : 0

  const prevReceita = sumType(txPrev, 'entrada')
  const prevSaidas = sumType(txPrev, 'saida')
  const prevSaldo = prevReceita - prevSaidas
  const prevMargem = prevReceita > 0 ? (prevSaldo / prevReceita) * 100 : 0

  // Prev month order count (from orders6 filtered to prevMes)
  const prevMesRange = prevRange
  const prevMesOrders = orders6.filter((o) => {
    if (!o.ordered_at) return false
    const d = new Date(o.ordered_at)
    return d >= new Date(prevMesRange.startISO) && d < new Date(prevMesRange.endISO)
  }).length
  const prevTicketMedio = prevMesOrders > 0 ? prevReceita / prevMesOrders : 0

  // ── Margin color ──
  const margemColor =
    margem > 40 ? 'text-success' : margem >= 20 ? 'text-warning' : 'text-danger'

  // ── Chart ──
  const chartData = buildChartData(tx6, orders6, mes)

  // ── Platform breakdown ──
  const platData = groupByPlatform(txMes)
  const platTotal = platData.reduce((s, p) => s + p.total, 0)

  // Prev platform totals for delta
  const prevPlatMap = new Map<string, number>()
  for (const t of txPrev) {
    if (t.type !== 'entrada' || !t.platform) continue
    prevPlatMap.set(t.platform, (prevPlatMap.get(t.platform) ?? 0) + t.amount)
  }

  // ── Categories ──
  const catData = groupByCategory(txMes, 'saida')
  const catTotal = catData.reduce((s, c) => s + c.total, 0)

  // ── SKU rankings ──
  const skuByRevenue = buildSkuByRevenue(txMes, productMap)
  const skuByVolume = buildSkuByVolume(ordersMes, productMap)

  // ── Comparativo ──
  const hasPrevData = prevReceita > 0 || prevSaidas > 0

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">Relatório</h1>
          <p className="text-sm text-muted mt-0.5">{formatMonthFull(mes)}</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButtons mes={mes} />
          <MesSeletor currentMes={mes} />
        </div>
      </div>

      {/* Hero — 4 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receita Líquida — hero (2 cols) */}
        <KpiCard
          label="Receita líquida"
          value={formatCurrency(receita)}
          delta={varPct(receita, prevReceita) ?? undefined}
          primary
          icon={<IconTrendingUp />}
        />

        {/* Pedidos */}
        <KpiCard
          label="Pedidos"
          value={String(pedidosMes)}
          delta={varPct(pedidosMes, prevMesOrders) ?? undefined}
          icon={<IconPackage />}
        />

        {/* Ticket Médio */}
        <KpiCard
          label="Ticket médio"
          value={formatCurrency(ticketMedio)}
          delta={varPct(ticketMedio, prevTicketMedio) ?? undefined}
          icon={<IconReceipt />}
        />

        {/* Margem */}
        <div className="flex flex-col gap-2 rounded-xl p-5 bg-surface border border-border">
          <div className="flex items-center justify-between">
            <span className="label-eyebrow text-[11px] font-medium uppercase text-muted">
              Margem
            </span>
            <span className="text-muted"><IconPercent /></span>
          </div>
          <span className={['kpi-value leading-none text-[20px] font-semibold tabular-nums', margemColor].join(' ')}>
            {margem.toFixed(1)}%
          </span>
          {varPct(margem, prevMargem) !== null && (
            <span className={[
              'text-xs font-medium tabular-nums flex items-center gap-1',
              (varPct(margem, prevMargem) ?? 0) >= 0 ? 'text-success' : 'text-danger',
            ].join(' ')}>
              {(varPct(margem, prevMargem) ?? 0) >= 0 ? '↑' : '↓'}
              {(varPct(margem, prevMargem) ?? 0) >= 0 ? '+' : ''}
              {(varPct(margem, prevMargem) ?? 0).toFixed(1)}% vs mês anterior
            </span>
          )}
        </div>
      </div>

      {/* Gráfico 6 meses */}
      <RelatorioChart data={chartData} currentMes={mes} />

      {/* Grid principal 3/5 + 2/5 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ── Coluna esquerda ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Receita por plataforma */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-text mb-4">Por plataforma</h2>
            {platData.length === 0 ? (
              <p className="text-sm text-muted">Sem receitas por plataforma este mês.</p>
            ) : (
              <div className="space-y-3">
                {platData.map(({ platform, total }) => {
                  const pct = platTotal > 0 ? (total / platTotal) * 100 : 0
                  const prevTotal = prevPlatMap.get(platform) ?? 0
                  const delta = varPct(total, prevTotal)
                  return (
                    <div key={platform}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <PlatformIcon platform={platform} />
                          <span className="text-text font-medium">
                            {PLATFORM_LABELS[platform] ?? platform}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted">{pct.toFixed(0)}%</span>
                          {delta !== null && (
                            <span className={delta >= 0 ? 'text-success' : 'text-danger'}>
                              {delta >= 0 ? '↑' : '↓'}{Math.abs(delta).toFixed(1)}%
                            </span>
                          )}
                          <span className="text-success tabular-nums font-medium">
                            {formatCurrency(total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success/50 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Saídas por categoria */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-text mb-4">Despesas</h2>
            {catData.length === 0 ? (
              <p className="text-sm text-muted">Sem saídas este mês.</p>
            ) : (
              <div className="space-y-3">
                {catData.map(({ name, total }) => {
                  const pct = catTotal > 0 ? (total / catTotal) * 100 : 0
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted">{name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted">{pct.toFixed(0)}%</span>
                          <span className="text-danger tabular-nums font-medium">
                            {formatCurrency(total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-danger/50 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Coluna direita ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Top SKUs */}
          <SkuRankingPanel
            byRevenue={skuByRevenue}
            byVolume={skuByVolume}
            mes={mes}
          />

          {/* Comparativo mês anterior */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-text mb-4">vs Mês anterior</h2>
            {!hasPrevData ? (
              <p className="text-sm text-muted">Sem dados do período anterior.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted uppercase tracking-wide border-b border-border">
                      <th className="text-left pb-2 font-medium">Métrica</th>
                      <th className="text-right pb-2 font-medium">Atual</th>
                      <th className="text-right pb-2 font-medium">Anterior</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <ComparativoRow label="Receita" curr={receita} prev={prevReceita} format="brl" />
                    <ComparativoRow label="Saídas" curr={saidas} prev={prevSaidas} format="brl" invert />
                    <ComparativoRow label="Saldo" curr={saldo} prev={prevSaldo} format="brl" />
                    <ComparativoRow label="Pedidos" curr={pedidosMes} prev={prevMesOrders} format="num" />
                    <ComparativoRow label="Ticket médio" curr={ticketMedio} prev={prevTicketMedio} format="brl" />
                    <ComparativoRow label="Margem" curr={margem} prev={prevMargem} format="pct" />
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface ComparativoRowProps {
  label: string
  curr: number
  prev: number
  format: 'brl' | 'num' | 'pct'
  invert?: boolean
}

function ComparativoRow({ label, curr, prev, format, invert = false }: ComparativoRowProps) {
  const pct = varPct(curr, prev)
  const positive = pct === null ? null : (invert ? pct < 0 : pct >= 0)

  function fmt(v: number): string {
    if (format === 'brl') return formatCurrency(v)
    if (format === 'pct') return `${v.toFixed(1)}%`
    return String(Math.round(v))
  }

  return (
    <tr>
      <td className="py-2 text-muted">{label}</td>
      <td className="py-2 text-right text-text tabular-nums font-medium">{fmt(curr)}</td>
      <td className="py-2 text-right text-muted tabular-nums">{fmt(prev)}</td>
      <td className="py-2 text-right">
        {pct === null ? (
          <span className="text-muted">—</span>
        ) : (
          <span className={[
            'font-medium tabular-nums text-[10px] px-1.5 py-0.5 rounded',
            positive
              ? 'bg-success/10 text-success'
              : 'bg-danger/10 text-danger',
          ].join(' ')}>
            {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
          </span>
        )}
      </td>
    </tr>
  )
}

function PlatformIcon({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    shopee: 'text-orange-400',
    tiktok: 'text-pink-400',
    mercadolivre: 'text-yellow-400',
    direto: 'text-accent',
    outro: 'text-muted',
  }
  const color = colors[platform] ?? 'text-muted'
  return (
    <span className={['w-3 h-3 shrink-0', color].join(' ')}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
      </svg>
    </span>
  )
}

function IconTrendingUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function IconPackage() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function IconReceipt() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
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
