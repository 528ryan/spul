'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { SkuDrawer } from './SkuDrawer'

export interface SkuByRevenue {
  sku: string
  name: string | null
  revenue: number
}

export interface SkuByVolume {
  sku: string
  name: string | null
  quantity: number
}

interface SkuRankingPanelProps {
  byRevenue: SkuByRevenue[]
  byVolume: SkuByVolume[]
  mes: string
}

type RankingMode = 'receita' | 'volume'

export function SkuRankingPanel({ byRevenue, byVolume, mes }: SkuRankingPanelProps) {
  const [mode, setMode] = useState<RankingMode>('receita')
  const [selectedSku, setSelectedSku] = useState<string | null>(null)

  const productNames: Record<string, string | null> = {}
  for (const s of byRevenue) productNames[s.sku] = s.name
  for (const s of byVolume) productNames[s.sku] = s.name ?? productNames[s.sku] ?? null

  const maxRev = byRevenue[0]?.revenue ?? 1
  const maxVol = byVolume[0]?.quantity ?? 1

  const openDrawer = (sku: string) => setSelectedSku(sku)
  const closeDrawer = () => setSelectedSku(null)

  return (
    <>
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text">Produtos</h2>
          <div className="flex items-center bg-surface-2 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setMode('receita')}
              className={[
                'text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer',
                mode === 'receita'
                  ? 'bg-accent/20 text-accent font-medium'
                  : 'text-muted hover:text-text',
              ].join(' ')}
            >
              Por receita
            </button>
            <button
              onClick={() => setMode('volume')}
              className={[
                'text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer',
                mode === 'volume'
                  ? 'bg-accent/20 text-accent font-medium'
                  : 'text-muted hover:text-text',
              ].join(' ')}
            >
              Por volume
            </button>
          </div>
        </div>

        {mode === 'receita' ? (
          byRevenue.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">Sem vendas com SKU este mês.</p>
          ) : (
            <ol className="space-y-2.5">
              {byRevenue.map((item, i) => (
                <li key={item.sku}>
                  <button
                    onClick={() => openDrawer(item.sku)}
                    className="w-full text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-muted-2 w-4 shrink-0 tabular-nums">
                        #{i + 1}
                      </span>
                      <span className="font-mono text-accent text-xs group-hover:text-text-2 transition-colors truncate">
                        {item.sku}
                      </span>
                      {item.name && (
                        <span className="text-xs text-muted truncate flex-1">{item.name}</span>
                      )}
                      <span className="text-xs font-medium text-success tabular-nums shrink-0">
                        {formatCurrency(item.revenue)}
                      </span>
                    </div>
                    <div className="h-1 bg-surface-2 rounded-full overflow-hidden ml-6">
                      <div
                        className="h-full bg-success/50 rounded-full transition-all"
                        style={{ width: `${maxRev > 0 ? (item.revenue / maxRev) * 100 : 0}%` }}
                      />
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          )
        ) : (
          byVolume.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">Sem pedidos com SKU este mês.</p>
          ) : (
            <ol className="space-y-2.5">
              {byVolume.map((item, i) => (
                <li key={item.sku}>
                  <button
                    onClick={() => openDrawer(item.sku)}
                    className="w-full text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-muted-2 w-4 shrink-0 tabular-nums">
                        #{i + 1}
                      </span>
                      <span className="font-mono text-accent text-xs group-hover:text-text-2 transition-colors truncate">
                        {item.sku}
                      </span>
                      {item.name && (
                        <span className="text-xs text-muted truncate flex-1">{item.name}</span>
                      )}
                      <span className="text-xs font-medium text-text tabular-nums shrink-0">
                        {item.quantity} un.
                      </span>
                    </div>
                    <div className="h-1 bg-surface-2 rounded-full overflow-hidden ml-6">
                      <div
                        className="h-full bg-accent/40 rounded-full transition-all"
                        style={{ width: `${maxVol > 0 ? (item.quantity / maxVol) * 100 : 0}%` }}
                      />
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          )
        )}
      </div>

      <SkuDrawer
        sku={selectedSku}
        productName={selectedSku ? (productNames[selectedSku] ?? null) : null}
        mes={mes}
        onClose={closeDrawer}
      />
    </>
  )
}
