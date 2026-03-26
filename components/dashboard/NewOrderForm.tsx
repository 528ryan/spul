'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { createOrder } from '@/app/actions/orders'
import { useToast } from '@/components/ui/ToastProvider'
import { Spinner } from '@/components/ui/Spinner'
import { useProdutos } from '@/lib/hooks/useProdutos'
import type { ProductVariant, ProductWithVariants } from '@/lib/types'

const PLATFORM_OPTIONS = [
  { value: 'shopee',       label: 'Shopee' },
  { value: 'tiktok',       label: 'TikTok Shop' },
  { value: 'mercadolivre', label: 'Mercado Livre' },
  { value: 'direto',       label: 'Direto' },
  { value: 'outro',        label: 'Outro' },
]

function formatAttrs(attrs: Record<string, string>): string {
  return Object.values(attrs).join(' | ')
}

interface OrderItemState {
  sku: string
  quantity: number
  variant_id: string | null
  variant_attributes: Record<string, string> | null
  // UI state
  productSearch: string
  selectedProduct: ProductWithVariants | null
  showSuggestions: boolean
}

function emptyItem(): OrderItemState {
  return {
    sku: '',
    quantity: 1,
    variant_id: null,
    variant_attributes: null,
    productSearch: '',
    selectedProduct: null,
    showSuggestions: false,
  }
}

interface NewOrderFormProps {
  onClose: () => void
}

export function NewOrderForm({ onClose }: NewOrderFormProps) {
  const [items, setItems] = useState<OrderItemState[]>([emptyItem()])
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()
  const { products } = useProdutos()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setItems((prev) => prev.map((item) => ({ ...item, showSuggestions: false })))
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function updateItem<K extends keyof OrderItemState>(index: number, field: K, value: OrderItemState[K]) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function handleProductSearch(index: number, value: string) {
    setItems((prev) => prev.map((item, i) => {
      if (i !== index) return item
      return {
        ...item,
        productSearch: value,
        showSuggestions: value.length > 0,
        selectedProduct: value === '' ? null : item.selectedProduct,
        sku: value === '' ? '' : item.sku,
        variant_id: value === '' ? null : item.variant_id,
        variant_attributes: value === '' ? null : item.variant_attributes,
      }
    }))
  }

  function selectProduct(index: number, product: ProductWithVariants) {
    const activeVariants = product.product_variants.filter((v) => v.is_active)
    setItems((prev) => prev.map((item, i) => {
      if (i !== index) return item
      return {
        ...item,
        selectedProduct: product,
        productSearch: product.name,
        showSuggestions: false,
        sku: activeVariants.length === 0 ? product.sku : '',
        variant_id: null,
        variant_attributes: null,
      }
    }))
  }

  function selectVariant(index: number, variant: ProductVariant) {
    setItems((prev) => prev.map((item, i) => {
      if (i !== index) return item
      return {
        ...item,
        sku: variant.sku,
        variant_id: variant.id,
        variant_attributes: variant.attributes,
      }
    }))
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function getFilteredProducts(search: string): ProductWithVariants[] {
    if (!search) return []
    const q = search.toLowerCase()
    return products
      .filter((p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      .slice(0, 5)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const validItems = items.filter((i) => i.sku.trim() !== '')
    if (validItems.length === 0) {
      showToast('Adicione ao menos 1 item com SKU', 'error')
      return
    }

    const data = {
      order_ref: (formData.get('order_ref') as string) || null,
      platform: (formData.get('platform') as string) || null,
      tracking_code: (formData.get('tracking_code') as string) || null,
      items: validItems.map((i) => ({
        sku: i.sku,
        quantity: i.quantity,
        variant_id: i.variant_id ?? null,
        variant_attributes: i.variant_attributes ?? null,
      })),
    }

    startTransition(async () => {
      const res = await createOrder(data)
      if (res.success) {
        showToast('Pedido criado', 'success')
        onClose()
      } else {
        showToast(res.error ?? 'Erro ao criar pedido', 'error')
      }
    })
  }

  const inputCls =
    'w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors'

  const selectCls =
    'w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors cursor-pointer'

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div ref={containerRef} className="bg-surface-2 border border-border rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text">Novo pedido</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-text transition-colors cursor-pointer">
            <IconX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wide">Nº do pedido</label>
              <input name="order_ref" placeholder="Opcional" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wide">Plataforma</label>
              <select name="platform" className={selectCls}>
                <option value="">Selecione</option>
                {PLATFORM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wide">Código de rastreio</label>
            <input name="tracking_code" placeholder="Ex: BR123456789BR (opcional)" className={inputCls} />
          </div>

          {/* Items */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted uppercase tracking-wide">Itens do pedido</label>
            {items.map((item, index) => {
              const suggestions = getFilteredProducts(item.productSearch)
              const activeVariants = (item.selectedProduct?.product_variants ?? []).filter((v) => v.is_active)

              return (
                <div key={index} className="bg-surface border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    {/* Product search */}
                    <div className="flex-1 relative">
                      <input
                        value={item.productSearch}
                        onChange={(e) => handleProductSearch(index, e.target.value)}
                        onFocus={() => updateItem(index, 'showSuggestions', item.productSearch.length > 0)}
                        placeholder="Produto ou SKU..."
                        className={`${inputCls} text-xs`}
                        autoComplete="off"
                      />
                      {item.showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
                          {suggestions.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onMouseDown={() => selectProduct(index, p)}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-2 transition-colors text-left cursor-pointer"
                            >
                              <span className="text-xs font-mono text-accent">{p.sku}</span>
                              <span className="text-xs text-muted truncate">{p.name}</span>
                              {p.product_variants.length > 0 && (
                                <span className="ml-auto text-[10px] text-muted">{p.product_variants.length}v</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quantity */}
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      className="w-14 bg-surface border border-border rounded-lg px-2 py-2 text-sm text-text text-center focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
                    />

                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)} className="text-muted hover:text-danger transition-colors cursor-pointer pt-2">
                        <IconMinus />
                      </button>
                    )}
                  </div>

                  {/* Variant selector */}
                  {item.selectedProduct && activeVariants.length > 0 && (
                    <select
                      value={item.variant_id ?? ''}
                      onChange={(e) => {
                        const v = activeVariants.find((v) => v.id === e.target.value)
                        if (v) selectVariant(index, v)
                        else updateItem(index, 'variant_id', null)
                      }}
                      className={`${selectCls} text-xs`}
                    >
                      <option value="">Selecione variação</option>
                      {activeVariants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.sku} — {formatAttrs(v.attributes)}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* SKU preview */}
                  {item.sku && (
                    <p className="text-[10px] text-muted font-mono">SKU: {item.sku}</p>
                  )}
                </div>
              )
            })}
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors cursor-pointer"
            >
              <IconPlus /> Adicionar item
            </button>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm border border-border rounded-lg text-muted hover:bg-surface-2 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-accent text-bg font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {isPending && <Spinner size="sm" />}
              {isPending ? 'Criando...' : 'Criar pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconMinus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
