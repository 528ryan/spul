'use client'

import { useState, useTransition } from 'react'
import { updateOrderStatus, addTrackingCode, deleteOrder } from '@/app/actions/orders'
import { useToast } from '@/components/ui/ToastProvider'
import { getOrderDelay } from '@/lib/order-delay'
import { formatDateTime } from '@/lib/utils'
import { PLATFORM_LABELS } from '@/lib/types'
import type { Order, OrderItem } from '@/lib/types'

const STATUS_SEQUENCE = ['received', 'queued', 'printed', 'packed', 'shipped'] as const
type OrderStatus = typeof STATUS_SEQUENCE[number]

const STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Recebido',
  queued:   'Na fila',
  printed:  'Impresso',
  packed:   'Embalado',
  shipped:  'Despachado',
}

function formatItem(item: OrderItem): string {
  const attrs = item.variant_attributes
    ? Object.values(item.variant_attributes).join(' | ')
    : null
  return attrs
    ? `${item.sku} | ${attrs} x${item.quantity}`
    : `${item.sku} x${item.quantity}`
}

interface KanbanCardProps {
  order: Order
}

export function KanbanCard({ order }: KanbanCardProps) {
  const [isPending, startTransition] = useTransition()
  const [trackingInput, setTrackingInput] = useState('')
  const [showTrackingInput, setShowTrackingInput] = useState(false)
  const [itemsExpanded, setItemsExpanded] = useState(false)
  const { showToast } = useToast()

  const delay = getOrderDelay(order.ordered_at)
  const isShipped = order.status === 'shipped'
  const showBadge = !isShipped && delay !== null && delay.level !== 'ok'
  const borderClass = !isShipped ? (delay?.borderClass ?? 'border-border') : 'border-border'
  const isPulsing = !isShipped && delay?.level === 'critical'

  const currentIdx = STATUS_SEQUENCE.indexOf(order.status as OrderStatus)
  const nextStatus = currentIdx < STATUS_SEQUENCE.length - 1 ? STATUS_SEQUENCE[currentIdx + 1] : null
  const prevStatus = currentIdx > 0 ? STATUS_SEQUENCE[currentIdx - 1] : null

  function advance() {
    if (!nextStatus) return
    startTransition(async () => {
      const res = await updateOrderStatus(order.id, nextStatus)
      if (!res.success) showToast(res.error ?? 'Erro ao atualizar', 'error')
    })
  }

  function retreat() {
    if (!prevStatus) return
    startTransition(async () => {
      const res = await updateOrderStatus(order.id, prevStatus)
      if (!res.success) showToast(res.error ?? 'Erro ao atualizar', 'error')
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteOrder(order.id)
      if (!res.success) showToast(res.error ?? 'Erro ao deletar', 'error')
      else showToast('Pedido e lançamento removidos', 'success')
    })
  }

  function handleSaveTracking() {
    if (!trackingInput.trim()) return
    startTransition(async () => {
      const res = await addTrackingCode(order.id, trackingInput.trim())
      if (res.success) {
        showToast('Rastreio salvo', 'success')
        setShowTrackingInput(false)
        setTrackingInput('')
      } else {
        showToast(res.error ?? 'Erro ao salvar', 'error')
      }
    })
  }

  const firstItem = order.order_items[0]
  const firstItemText = firstItem ? formatItem(firstItem) : ''
  const extraItems = order.order_items.slice(1)
  const extraCount = extraItems.length
  const dateLabel = order.ordered_at
    ? formatDateTime(order.ordered_at)
    : formatDateTime(order.created_at)

  return (
    <div
      className={[
        'bg-surface-2 rounded-lg p-3 space-y-2.5',
        'border-2',
        borderClass,
        isPulsing ? 'animate-pulse' : '',
      ].join(' ')}
    >
      {/* Delay badge */}
      {showBadge && delay && (
        <div className={`text-[10px] font-medium px-1.5 py-0.5 rounded border w-fit ${delay.colorClass}`}>
          {delay.label}
        </div>
      )}

      {/* Main info */}
      <div>
        {order.tracking_code ? (
          <>
            <div className="flex items-center gap-1.5">
              <p
                className="text-sm font-mono text-accent font-semibold truncate flex-1"
                title={order.tracking_code}
              >
                {order.tracking_code}
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowTrackingInput(true)
                  setTrackingInput(order.tracking_code ?? '')
                }}
                className="text-muted hover:text-text transition-colors cursor-pointer shrink-0"
                title="Editar rastreio"
              >
                <IconPencilSmall />
              </button>
            </div>
            {firstItemText && (
              <div className="mt-0.5">
                <p className="text-xs text-muted truncate">{firstItemText}</p>
                {extraCount > 0 && (
                  <ItemsExpandBadge
                    extraCount={extraCount}
                    extraItems={extraItems}
                    expanded={itemsExpanded}
                    onToggle={() => setItemsExpanded(!itemsExpanded)}
                  />
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-text font-medium truncate" title={firstItemText}>
              {firstItemText || '—'}
            </p>
            {extraCount > 0 && (
              <ItemsExpandBadge
                extraCount={extraCount}
                extraItems={extraItems}
                expanded={itemsExpanded}
                onToggle={() => setItemsExpanded(!itemsExpanded)}
              />
            )}
            <button
              type="button"
              onClick={() => setShowTrackingInput(true)}
              className="flex items-center gap-1 text-[10px] text-muted hover:text-accent transition-colors cursor-pointer mt-0.5"
            >
              <IconTracking /> Adicionar rastreio
            </button>
          </>
        )}
      </div>

      {/* Tracking input inline */}
      {showTrackingInput && (
        <div className="flex items-center gap-1.5">
          <input
            value={trackingInput}
            onChange={(e) => setTrackingInput(e.target.value)}
            placeholder="Ex: BR123456789BR"
            className="flex-1 bg-surface border border-border rounded px-2 py-1 text-xs text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/40 font-mono"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTracking() }}
            autoFocus
          />
          <button
            type="button"
            onClick={handleSaveTracking}
            disabled={isPending}
            className="text-xs text-success border border-success/30 rounded px-2 py-1 hover:bg-success-dim transition-colors disabled:opacity-40 cursor-pointer"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => { setShowTrackingInput(false); setTrackingInput('') }}
            className="text-xs text-muted hover:text-text transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap">
        {order.platform && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-muted text-accent">
            {PLATFORM_LABELS[order.platform] ?? order.platform}
          </span>
        )}
        {order.order_ref && (
          <span className="text-[10px] text-muted font-mono">#{order.order_ref}</span>
        )}
        <span className="text-[10px] text-muted ml-auto">{dateLabel}</span>
      </div>

      {/* Status actions */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-border">
        {prevStatus && (
          <button
            type="button"
            onClick={retreat}
            disabled={isPending}
            title={`← ${STATUS_LABELS[prevStatus]}`}
            className="flex-none text-xs text-muted border border-border rounded px-2 py-1 hover:bg-surface hover:text-text transition-colors disabled:opacity-40 cursor-pointer"
          >
            ←
          </button>
        )}

        {nextStatus ? (
          <button
            type="button"
            onClick={advance}
            disabled={isPending}
            className="flex-1 text-xs text-accent border border-accent/30 rounded py-1 hover:bg-accent-muted transition-colors disabled:opacity-40 cursor-pointer"
          >
            → {STATUS_LABELS[nextStatus]}
          </button>
        ) : (
          <span className="flex-1 text-center text-xs text-success">Despachado</span>
        )}

        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          title="Remover pedido"
          className="p-1 text-muted hover:text-danger transition-colors disabled:opacity-40 cursor-pointer shrink-0"
        >
          <IconTrash />
        </button>
      </div>
    </div>
  )
}

interface ItemsExpandBadgeProps {
  extraCount: number
  extraItems: OrderItem[]
  expanded: boolean
  onToggle: () => void
}

function ItemsExpandBadge({ extraCount, extraItems, expanded, onToggle }: ItemsExpandBadgeProps) {
  return (
    <div className="mt-0.5">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent/80 transition-colors cursor-pointer"
      >
        +{extraCount}
        <span className="text-[8px]">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div
          className="mt-1 space-y-0.5 overflow-hidden"
          style={{ animation: 'spul-expand 200ms ease' }}
        >
          {extraItems.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-accent shrink-0">{item.sku}</span>
              {item.variant_attributes && (
                <span className="text-[10px] text-muted truncate">
                  {Object.values(item.variant_attributes as Record<string, string>).join(' | ')}
                </span>
              )}
              <span className="text-[10px] text-muted ml-auto shrink-0">x{item.quantity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function IconPencilSmall() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function IconTracking() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}
