'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { KanbanCard } from './KanbanCard'
import { getOrderDelay } from '@/lib/order-delay'
import { PLATFORM_LABELS } from '@/lib/types'
import { useToast } from '@/components/ui/ToastProvider'
import { moveAllOrders } from '@/app/actions/orders'
import type { Order } from '@/lib/types'
import type { DelayLevel } from '@/lib/order-delay'

const ACTIVE_STATUSES = ['received', 'queued', 'printed', 'packed'] as const
type ActiveStatus = typeof ACTIVE_STATUSES[number]

const STATUS_LABELS: Record<ActiveStatus, string> = {
  received: 'Recebido',
  queued:   'Fila',
  printed:  'Impresso',
  packed:   'Embalado',
}

const ALL_STATUS_LABELS: Record<string, string> = {
  received: 'Recebido',
  queued:   'Na fila',
  printed:  'Impresso',
  packed:   'Embalado',
  shipped:  'Despachado',
}

const NEXT_STATUS: Record<ActiveStatus, string> = {
  received: 'queued',
  queued:   'printed',
  printed:  'packed',
  packed:   'shipped',
}

const DELAY_RANK: Record<DelayLevel, number> = { ok: 0, warning: 1, alert: 2, critical: 3 }

function worstDelayLevel(orders: Order[]): DelayLevel | null {
  let worst: DelayLevel | null = null
  for (const o of orders) {
    const d = getOrderDelay(o.ordered_at)
    if (!d || d.level === 'ok') continue
    if (worst === null || DELAY_RANK[d.level] > DELAY_RANK[worst]) worst = d.level
  }
  return worst
}

function columnHeaderColor(level: DelayLevel | null): string {
  switch (level) {
    case 'critical': return 'text-danger border-danger/40'
    case 'alert':    return 'text-orange-400 border-orange-500/40'
    case 'warning':  return 'text-yellow-400 border-yellow-500/30'
    default:         return 'text-muted border-border'
  }
}

interface ConfirmModal {
  fromStatus: ActiveStatus
  toStatus:   string
  count:      number
}

interface ProducaoClientProps {
  ordersByStatus: Record<ActiveStatus, Order[]>
  shippedOrders: Order[]
}

export function ProducaoClient({ ordersByStatus, shippedOrders }: ProducaoClientProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [mobileTab, setMobileTab] = useState<'all' | ActiveStatus>('all')
  const [shippedOpen, setShippedOpen] = useState(false)
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleMoveAll() {
    if (!confirmModal) return
    const { fromStatus, toStatus, count } = confirmModal
    startTransition(async () => {
      const res = await moveAllOrders(fromStatus, toStatus)
      setConfirmModal(null)
      if (res.success) {
        showToast(
          `${res.count ?? count} pedidos movidos para ${ALL_STATUS_LABELS[toStatus] ?? toStatus}`,
          'success',
        )
      } else {
        showToast(res.error ?? 'Erro ao mover pedidos', 'error')
      }
    })
  }

  const allActive = ACTIVE_STATUSES.flatMap((s) => ordersByStatus[s])
  const mobileOrders = mobileTab === 'all' ? allActive : ordersByStatus[mobileTab]

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 className="text-xl font-semibold text-text">Produção</h1>
        <button
          type="button"
          onClick={() => router.push('/lancamentos')}
          className="hidden lg:flex items-center gap-1.5 px-4 py-2 bg-accent text-bg text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
        >
          <IconPlus />
          Novo pedido
        </button>
      </div>

      {/* Desktop Kanban — 4 columns */}
      <div className="hidden lg:grid grid-cols-4 gap-3 items-start">
        {ACTIVE_STATUSES.map((status) => {
          const orders = ordersByStatus[status]
          const worst = worstDelayLevel(orders)
          const headerColor = columnHeaderColor(worst)
          const nextStatus = NEXT_STATUS[status]
          return (
            <div key={status} className="space-y-2">
              <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-xs font-medium uppercase tracking-wide ${headerColor}`}>
                <span>{STATUS_LABELS[status]}</span>
                <div className="flex items-center gap-2">
                  {orders.length > 0 && <span className="font-bold">{orders.length}</span>}
                  {orders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setConfirmModal({ fromStatus: status, toStatus: nextStatus, count: orders.length })}
                      className="text-[10px] font-normal normal-case tracking-normal text-muted hover:text-accent transition-colors cursor-pointer"
                    >
                      Mover todos →
                    </button>
                  )}
                </div>
              </div>
              {orders.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-4 text-center text-xs text-muted">
                  Vazio
                </div>
              ) : (
                orders.map((order) => <KanbanCard key={order.id} order={order} />)
              )}
            </div>
          )
        })}
      </div>

      {/* Modal de confirmação "Mover todos" */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/70 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-sm shadow-xl">
            <p className="text-text text-sm font-medium mb-1">Mover todos os pedidos?</p>
            <p className="text-muted text-sm mb-6">
              Mover <span className="text-text font-semibold">{confirmModal.count}</span> pedidos
              de <span className="text-text">&quot;{ALL_STATUS_LABELS[confirmModal.fromStatus]}&quot;</span>{' '}
              para <span className="text-text">&quot;{ALL_STATUS_LABELS[confirmModal.toStatus]}&quot;</span>.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={isPending}
                className="px-4 py-2 text-sm text-muted hover:text-text border border-border rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleMoveAll}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium bg-accent text-bg rounded-lg hover:bg-accent-dim transition-colors disabled:opacity-50"
              >
                {isPending ? 'Movendo…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile list with tabs */}
      <div className="lg:hidden">
        <div className="flex gap-1 overflow-x-auto pb-1 mb-4">
          {(['all', ...ACTIVE_STATUSES] as Array<'all' | ActiveStatus>).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMobileTab(value)}
              className={[
                'shrink-0 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer',
                mobileTab === value
                  ? 'bg-accent text-bg'
                  : 'bg-surface border border-border text-muted hover:text-text',
              ].join(' ')}
            >
              {value === 'all' ? 'Todos' : STATUS_LABELS[value]}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {mobileOrders.map((order) => (
            <KanbanCard key={order.id} order={order} />
          ))}
          {mobileOrders.length === 0 && (
            <div className="text-center py-10">
              <p className="text-sm text-muted">Nenhum pedido neste status.</p>
            </div>
          )}
        </div>
      </div>

      {/* Despachados */}
      {shippedOrders.length > 0 && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShippedOpen((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-muted hover:text-text transition-colors cursor-pointer"
          >
            <span
              className="inline-block transition-transform duration-200"
              style={{ transform: shippedOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <IconChevronDown />
            </span>
            Despachados ({shippedOrders.length})
          </button>

          {shippedOpen && (
            <div className="mt-3 bg-surface border border-border rounded-xl overflow-hidden">
              {shippedOrders.map((order) => {
                const skus = order.order_items
                  .map((i) => `${i.sku}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`)
                  .join(', ')
                const label = order.tracking_code ?? (skus || '—')
                const date = new Intl.DateTimeFormat('pt-BR').format(new Date(order.updated_at))
                return (
                  <div
                    key={order.id}
                    className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 hover:bg-surface-2 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text truncate">{label}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {order.platform && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-muted text-accent">
                            {PLATFORM_LABELS[order.platform] ?? order.platform}
                          </span>
                        )}
                        {order.order_ref && (
                          <span className="text-[10px] text-muted font-mono">
                            #{order.order_ref}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted shrink-0">{date}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Mobile FAB */}
      <button
        type="button"
        onClick={() => router.push('/lancamentos')}
        className="lg:hidden fixed bottom-6 right-6 z-40 flex items-center justify-center w-12 h-12 bg-accent text-bg rounded-full shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
        aria-label="Novo pedido"
      >
        <IconPlus />
      </button>
    </>
  )
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
