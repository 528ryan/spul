import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KpiCard } from '@/components/ui'
import { MesSeletor } from '@/components/dashboard/MesSeletor'
import { formatCurrency } from '@/lib/utils'
import { PLATFORM_LABELS } from '@/lib/types'
import type { Transaction, Profile } from '@/lib/types'

// ── types ─────────────────────────────────────────────────────────────────

type TxSlim = Pick<Transaction, 'type' | 'amount' | 'date' | 'platform'>

type RecentTx = Pick<
  Transaction,
  'id' | 'type' | 'description' | 'amount' | 'category_name' | 'date'
>

type InsightColor = 'muted' | 'warning' | 'success' | 'danger' | 'accent'

// ── date helpers ──────────────────────────────────────────────────────────

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
  // m is 1-based; new Date(y, m, 1) = first day of next month (JS month is 0-based)
  return dateToYMD(new Date(y, m, 1))
}

function prevMes(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 2, 1) // m-1 = current (0-indexed), m-2 = previous
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function sixMonthsStart(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  // 6 months ending at selected month: start = 5 months back
  // new Date(y, m-1-5, 1) = new Date(y, m-6, 1)
  return dateToYMD(new Date(y, m - 6, 1))
}

// ── aggregation helpers ───────────────────────────────────────────────────

function filterByRange(txs: TxSlim[], start: string, end: string): TxSlim[] {
  return txs.filter((t) => t.date >= start && t.date < end)
}

function sumType(txs: TxSlim[], type: 'entrada' | 'saida'): number {
  return txs
    .filter((t) => t.type === type)
    .reduce((s, t) => s + t.amount, 0)
}

function calcDelta(curr: number, prev: number): number | undefined {
  if (prev === 0) return undefined
  return ((curr - prev) / prev) * 100
}

function buildChart(
  allTxs: TxSlim[],
  mes: string,
): { mes: string; label: string; entradas: number; saidas: number }[] {
  const [y, m] = mes.split('-').map(Number)
  return Array.from({ length: 6 }, (_, i) => {
    // i=0 → 5 months ago, i=5 → selected month
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

function buildPlatforms(
  txs: TxSlim[],
): { platform: string; total: number }[] {
  const map = new Map<string, number>()
  for (const t of txs) {
    if (t.platform) map.set(t.platform, (map.get(t.platform) ?? 0) + t.amount)
  }
  return [...map.entries()]
    .map(([platform, total]) => ({ platform, total }))
    .sort((a, b) => b.total - a.total)
}

function formatDateShort(s: string): string {
  const [y, mo, d] = s.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

// ── page ──────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { mes: mesParam } = await searchParams
  const mes = mesParam ?? currentMes()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sixStart   = sixMonthsStart(mes)
  const mesEndDate = mesEnd(mes)

  const [sixMonthResult, recentResult, profileResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('type, amount, date, platform')
      .eq('user_id', user.id)
      .gte('date', sixStart)
      .lt('date', mesEndDate)
      .order('date', { ascending: true }),

    supabase
      .from('transactions')
      .select('id, type, description, amount, category_name, date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8),

    supabase
      .from('profiles')
      .select('business_name, business_type')
      .eq('id', user.id)
      .single(),
  ])

  const allTxs   = (sixMonthResult.data ?? []) as TxSlim[]
  const recentTxs = (recentResult.data ?? []) as RecentTx[]
  const profile   = profileResult.data as Pick<
    Profile,
    'business_name' | 'business_type'
  > | null

  // ── KPI calculations ────────────────────────────────────────────────────
  const prev     = prevMes(mes)
  const currTxs  = filterByRange(allTxs, mesStart(mes), mesEnd(mes))
  const prevTxs  = filterByRange(allTxs, mesStart(prev), mesEnd(prev))

  const currEntradas = sumType(currTxs, 'entrada')
  const currSaidas   = sumType(currTxs, 'saida')
  const currSaldo    = currEntradas - currSaidas
  const currMargem   =
    currEntradas > 0 ? ((currEntradas - currSaidas) / currEntradas) * 100 : 0

  const prevEntradas = sumType(prevTxs, 'entrada')
  const prevSaidas   = sumType(prevTxs, 'saida')
  const prevSaldo    = prevEntradas - prevSaidas
  const prevMargem   =
    prevEntradas > 0 ? ((prevEntradas - prevSaidas) / prevEntradas) * 100 : 0

  const margemDelta: number | undefined =
    prevMargem !== 0 ? currMargem - prevMargem : undefined

  // ── chart + platform ────────────────────────────────────────────────────
  const chart    = buildChart(allTxs, mes)
  const chartMax = Math.max(...chart.flatMap((c) => [c.entradas, c.saidas]), 1)

  const platforms     = buildPlatforms(currTxs)
  const platformTotal = platforms.reduce((s, p) => s + p.total, 0)

  // ── insight logic ────────────────────────────────────────────────────────
  const uniquePlatforms = platforms.filter((p) => p.total > 0).length

  let insightColor: InsightColor = 'muted'
  let insightTitle = 'Comece a registrar'
  let insightBody  =
    'Nenhum lançamento este mês. Registre vendas e despesas para ver seus indicadores.'

  if (currEntradas > 0 || currSaidas > 0) {
    if (uniquePlatforms === 1) {
      insightColor = 'warning'
      insightTitle = 'Diversifique canais'
      insightBody  =
        'Todas suas entradas estão em uma plataforma. Considere expandir para reduzir riscos.'
    } else if (currMargem > 60) {
      insightColor = 'success'
      insightTitle = 'Ótima margem!'
      insightBody  = `Sua margem está em ${currMargem.toFixed(0)}%. Excelente resultado — continue assim!`
    } else if (currMargem < 30 && currEntradas > 0) {
      insightColor = 'danger'
      insightTitle = 'Revise seus custos'
      insightBody  = `Margem de ${currMargem.toFixed(0)}% está abaixo do ideal. Analise suas despesas para melhorar.`
    } else {
      insightColor = 'accent'
      insightTitle = 'No caminho certo'
      insightBody  =
        'Continue registrando suas movimentações para insights mais precisos.'
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">Dashboard</h1>
          {profile?.business_name && (
            <p className="text-sm text-muted mt-0.5">{profile.business_name}</p>
          )}
        </div>
        <MesSeletor currentMes={mes} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Saldo"
          value={formatCurrency(currSaldo)}
          delta={calcDelta(currSaldo, prevSaldo)}
          icon={<IconWallet />}
          primary
        />
        <KpiCard
          label="Entradas"
          value={formatCurrency(currEntradas)}
          delta={calcDelta(currEntradas, prevEntradas)}
          icon={<IconArrowUp />}
        />
        <KpiCard
          label="Saídas"
          value={formatCurrency(currSaidas)}
          delta={calcDelta(currSaidas, prevSaidas)}
          icon={<IconArrowDown />}
        />
        <KpiCard
          label="Margem"
          value={`${currMargem.toFixed(1)}%`}
          delta={margemDelta}
          icon={<IconPercent />}
        />
      </div>

      {/* Row 2: Chart + Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5">
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

          <div className="flex items-end gap-2">
            {chart.map(({ mes: mKey, label, entradas, saidas }) => {
              const eH = entradas > 0
                ? Math.max(Math.round((entradas / chartMax) * 120), 3)
                : 0
              const sH = saidas > 0
                ? Math.max(Math.round((saidas / chartMax) * 120), 3)
                : 0
              return (
                <div key={mKey} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center gap-0.5 h-[120px]">
                    <div
                      style={{ height: `${eH}px` }}
                      className="flex-1 bg-success/50 hover:bg-success/70 rounded-t transition-colors"
                      title={`Entradas ${label}: ${formatCurrency(entradas)}`}
                    />
                    <div
                      style={{ height: `${sH}px` }}
                      className="flex-1 bg-danger/50 hover:bg-danger/70 rounded-t transition-colors"
                      title={`Saídas ${label}: ${formatCurrency(saidas)}`}
                    />
                  </div>
                  <span className="text-[10px] text-muted capitalize">{label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Insight Widget */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text">Insight do mês</h2>
          <InsightCard
            color={insightColor}
            title={insightTitle}
            body={insightBody}
          />
        </div>
      </div>

      {/* Row 3: Recent Transactions + Platform Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text">Lançamentos recentes</h2>
            <a
              href="/lancamentos"
              className="text-xs text-accent hover:text-accent-dim transition-colors"
            >
              Ver todos →
            </a>
          </div>

          {recentTxs.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted">Nenhum lançamento registrado.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentTxs.map((tx) => {
                const isEntrada = tx.type === 'entrada'
                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2 transition-colors"
                  >
                    <span
                      className={[
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        isEntrada ? 'bg-success' : 'bg-danger',
                      ].join(' ')}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text font-medium truncate">
                        {tx.description}
                      </p>
                      <p className="text-xs text-muted">{tx.category_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={[
                          'text-sm font-medium tabular-nums',
                          isEntrada ? 'text-success' : 'text-danger',
                        ].join(' ')}
                      >
                        {isEntrada ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </p>
                      <p className="text-xs text-muted">{formatDateShort(tx.date)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Platform Breakdown */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-text mb-4">Por plataforma</h2>
          {platforms.length === 0 ? (
            <p className="text-sm text-muted">
              Sem dados de plataforma este mês.
            </p>
          ) : (
            <div className="space-y-3">
              {platforms.map(({ platform, total }) => (
                <div key={platform}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted">
                      {PLATFORM_LABELS[platform] ?? platform}
                    </span>
                    <span className="text-text tabular-nums">
                      {formatCurrency(total)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent/60 rounded-full"
                      style={{ width: `${(total / platformTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── sub-components ────────────────────────────────────────────────────────

function InsightCard({
  color,
  title,
  body,
}: {
  color: InsightColor
  title: string
  body: string
}) {
  const colorMap: Record<InsightColor, string> = {
    muted:   'text-muted bg-surface-2',
    warning: 'text-yellow-400 bg-yellow-400/10',
    success: 'text-success bg-success-dim',
    danger:  'text-danger bg-danger-dim',
    accent:  'text-accent bg-accent-muted',
  }
  return (
    <div className={['rounded-xl p-4 flex-1', colorMap[color]].join(' ')}>
      <p className="text-sm font-semibold mb-1.5">{title}</p>
      <p className="text-xs leading-relaxed opacity-80">{body}</p>
    </div>
  )
}

function IconWallet() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z" />
      <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconArrowUp() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  )
}

function IconArrowDown() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  )
}

function IconPercent() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  )
}
