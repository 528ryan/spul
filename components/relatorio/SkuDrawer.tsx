'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import { formatShortDate } from '@/lib/date-helpers'
import { PLATFORM_LABELS } from '@/lib/types'

interface SkuSummary {
  pedidos: number
  receita: number
  quantidade: number
}

interface SkuMes {
  mes: string
  label: string
  receita: number
}

interface RecentOrder {
  id: string
  platform: string | null
  tracking_code: string | null
  ordered_at: string | null
  created_at: string
}

interface SkuData {
  summary: SkuSummary
  evolution: SkuMes[]
  recentOrders: RecentOrder[]
}

interface SkuDrawerProps {
  sku: string | null
  productName: string | null
  mes: string
  onClose: () => void
}

export function SkuDrawer({ sku, productName, mes, onClose }: SkuDrawerProps) {
  const isOpen = sku !== null
  const [data, setData] = useState<SkuData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async (skuVal: string) => {
    setLoading(true)
    setData(null)
    try {
      const res = await fetch(`/api/relatorio/sku?sku=${encodeURIComponent(skuVal)}&mes=${mes}`)
      if (res.ok) {
        const json = (await res.json()) as SkuData
        setData(json)
      }
    } finally {
      setLoading(false)
    }
  }, [mes])

  useEffect(() => {
    if (sku) fetchData(sku)
  }, [sku, fetchData])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const maxEvo = data ? Math.max(...data.evolution.map((e) => e.receita), 1) : 1
  const ticketMedio = data && data.summary.pedidos > 0
    ? data.summary.receita / data.summary.pedidos
    : 0

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={[
          'fixed inset-0 z-40 bg-bg/60 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes do SKU ${sku ?? ''}`}
        className={[
          'fixed right-0 top-0 h-full z-50 flex flex-col',
          'w-full max-w-[420px] bg-surface border-l border-border',
          'transition-transform duration-300 ease-in-out overflow-y-auto',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border sticky top-0 bg-surface z-10">
          <div>
            <p className="font-mono text-accent text-sm font-medium">{sku}</p>
            {productName && (
              <p className="text-text font-semibold mt-0.5">{productName}</p>
            )}
            <p className="text-xs text-muted mt-1">{mes}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-text transition-colors p-1.5 rounded-lg hover:bg-surface-2 cursor-pointer"
            aria-label="Fechar"
          >
            <IconX />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 space-y-6">
          {loading && (
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-surface-2 rounded-xl" />
                ))}
              </div>
              <div className="h-24 bg-surface-2 rounded-xl" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-surface-2 rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {!loading && data && (
            <>
              {/* Resumo */}
              <div>
                <h3 className="label-eyebrow text-[10px] font-medium uppercase text-muted mb-3">
                  Resumo do mês
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-2 rounded-xl p-4">
                    <p className="text-xs text-muted mb-1">Pedidos</p>
                    <p className="text-xl font-semibold text-text tabular-nums">
                      {data.summary.pedidos}
                    </p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-4">
                    <p className="text-xs text-muted mb-1">Receita</p>
                    <p className="text-xl font-semibold text-success tabular-nums kpi-value">
                      {formatCurrency(data.summary.receita)}
                    </p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-4">
                    <p className="text-xs text-muted mb-1">Ticket médio</p>
                    <p className="text-xl font-semibold text-text tabular-nums kpi-value">
                      {formatCurrency(ticketMedio)}
                    </p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-4">
                    <p className="text-xs text-muted mb-1">Quantidade</p>
                    <p className="text-xl font-semibold text-text tabular-nums">
                      {data.summary.quantidade}
                    </p>
                  </div>
                </div>
              </div>

              {/* Evolução 6 meses */}
              <div>
                <h3 className="label-eyebrow text-[10px] font-medium uppercase text-muted mb-3">
                  Evolução 6 meses
                </h3>
                <div className="bg-surface-2 rounded-xl p-4">
                  <div className="flex items-end gap-1.5 h-[72px]">
                    {data.evolution.map(({ mes: m, label, receita }) => {
                      const h = receita > 0 ? Math.max(Math.round((receita / maxEvo) * 72), 3) : 0
                      const isCurrent = m === mes
                      return (
                        <div key={m} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full flex items-end h-[60px]">
                            <div
                              style={{ height: `${h}px` }}
                              className={[
                                'w-full rounded-t transition-colors',
                                isCurrent ? 'bg-accent/70' : 'bg-accent/30',
                              ].join(' ')}
                              title={`${label}: ${formatCurrency(receita)}`}
                            />
                          </div>
                          <span className={['text-[9px]', isCurrent ? 'text-accent' : 'text-muted'].join(' ')}>
                            {label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Pedidos recentes */}
              <div>
                <h3 className="label-eyebrow text-[10px] font-medium uppercase text-muted mb-3">
                  Pedidos recentes
                </h3>
                {data.recentOrders.length === 0 ? (
                  <p className="text-sm text-muted">Nenhum pedido encontrado.</p>
                ) : (
                  <div className="space-y-2">
                    {data.recentOrders.map((order) => {
                      const dateStr = order.ordered_at ?? order.created_at
                      return (
                        <div
                          key={order.id}
                          className="bg-surface-2 rounded-lg p-3 flex items-center gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-muted">
                                {formatShortDate(dateStr)}
                              </span>
                              {order.platform && (
                                <span className="text-[10px] bg-accent/10 text-accent rounded px-1.5 py-0.5">
                                  {PLATFORM_LABELS[order.platform] ?? order.platform}
                                </span>
                              )}
                            </div>
                            {order.tracking_code && (
                              <p className="text-xs font-mono text-muted-2 mt-0.5 truncate">
                                {order.tracking_code}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {!loading && !data && sku && (
            <p className="text-sm text-muted text-center py-8">
              Não foi possível carregar os dados.
            </p>
          )}
        </div>
      </div>
    </>
  )
}

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
