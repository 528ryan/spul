'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

export interface ChartMes {
  mes: string
  label: string
  entradas: number
  saidas: number
  pedidos: number
}

interface RelatorioChartProps {
  data: ChartMes[]
  currentMes: string
}

type ChartMode = 'receita' | 'pedidos'

export function RelatorioChart({ data, currentMes }: RelatorioChartProps) {
  const [mode, setMode] = useState<ChartMode>('receita')

  const maxReceita = Math.max(...data.flatMap((d) => [d.entradas, d.saidas]), 1)
  const maxPedidos = Math.max(...data.map((d) => d.pedidos), 1)

  const isEmpty = data.every((d) => d.entradas === 0 && d.saidas === 0 && d.pedidos === 0)

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-text">Evolução de receita</h2>

        <div className="flex items-center bg-surface-2 rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setMode('receita')}
            className={[
              'text-xs px-3 py-1.5 rounded-md transition-colors cursor-pointer',
              mode === 'receita'
                ? 'bg-accent/20 text-accent font-medium'
                : 'text-muted hover:text-text',
            ].join(' ')}
          >
            Receita
          </button>
          <button
            onClick={() => setMode('pedidos')}
            className={[
              'text-xs px-3 py-1.5 rounded-md transition-colors cursor-pointer',
              mode === 'pedidos'
                ? 'bg-accent/20 text-accent font-medium'
                : 'text-muted hover:text-text',
            ].join(' ')}
          >
            Pedidos
          </button>
        </div>
      </div>

      {isEmpty ? (
        <p className="text-sm text-muted py-8 text-center">Sem dados para exibir</p>
      ) : mode === 'receita' ? (
        <div className="flex items-end gap-2">
          {data.map(({ mes, label, entradas, saidas }) => {
            const eH = entradas > 0 ? Math.max(Math.round((entradas / maxReceita) * 120), 3) : 0
            const sH = saidas > 0 ? Math.max(Math.round((saidas / maxReceita) * 120), 3) : 0
            const isCurrent = mes === currentMes
            return (
              <div key={mes} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end justify-center gap-0.5 h-[120px]">
                  <div
                    style={{ height: `${eH}px` }}
                    className={[
                      'flex-1 rounded-t transition-colors',
                      isCurrent ? 'bg-success/70' : 'bg-success/35',
                    ].join(' ')}
                    title={`Entradas ${label}: ${formatCurrency(entradas)}`}
                  />
                  <div
                    style={{ height: `${sH}px` }}
                    className={[
                      'flex-1 rounded-t transition-colors',
                      isCurrent ? 'bg-danger/70' : 'bg-danger/35',
                    ].join(' ')}
                    title={`Saídas ${label}: ${formatCurrency(saidas)}`}
                  />
                </div>
                <span className={['text-[10px] capitalize', isCurrent ? 'text-accent font-medium' : 'text-muted'].join(' ')}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex items-end gap-2">
          {data.map(({ mes, label, pedidos }) => {
            const h = pedidos > 0 ? Math.max(Math.round((pedidos / maxPedidos) * 120), 3) : 0
            const isCurrent = mes === currentMes
            return (
              <div key={mes} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end justify-center h-[120px]">
                  <div
                    style={{ height: `${h}px` }}
                    className={[
                      'w-full rounded-t transition-colors',
                      isCurrent ? 'bg-accent/70' : 'bg-accent/30',
                    ].join(' ')}
                    title={`${label}: ${pedidos} pedido${pedidos !== 1 ? 's' : ''}`}
                  />
                </div>
                <span className={['text-[10px] capitalize', isCurrent ? 'text-accent font-medium' : 'text-muted'].join(' ')}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      {mode === 'receita' && !isEmpty && (
        <div className="flex items-center gap-4 mt-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success/60 inline-block" />
            Entradas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-danger/60 inline-block" />
            Saídas
          </span>
        </div>
      )}
    </div>
  )
}
