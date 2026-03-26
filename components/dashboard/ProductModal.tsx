'use client'

import { useState, useTransition, useRef } from 'react'
import { createProduct, updateProduct } from '@/app/actions/products'
import { useToast } from '@/components/ui/ToastProvider'
import { Spinner } from '@/components/ui/Spinner'
import type { Product } from '@/lib/types'

const PLATFORM_OPTIONS = [
  { value: 'shopee',       label: 'Shopee' },
  { value: 'tiktok',       label: 'TikTok Shop' },
  { value: 'mercadolivre', label: 'Mercado Livre' },
  { value: 'direto',       label: 'Direto' },
  { value: 'outro',        label: 'Outro' },
]

interface ProductModalProps {
  product?: Product
  onClose: () => void
}

export function ProductModal({ product, onClose }: ProductModalProps) {
  const [showDetails, setShowDetails] = useState(!!product)
  const [isPending, startTransition] = useTransition()
  const [sku, setSku] = useState(product?.sku ?? '')
  const { showToast } = useToast()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = product
        ? await updateProduct(product.id, formData)
        : await createProduct(formData)

      if (res.success) {
        showToast(product ? 'Produto atualizado' : 'Produto criado', 'success')
        onClose()
      } else {
        showToast(res.error ?? 'Erro inesperado', 'error')
      }
    })
  }

  const inputCls =
    'w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors'

  const selectCls =
    'w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors cursor-pointer'

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-2 border border-border rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text">
            {product ? 'Editar produto' : 'Novo produto'}
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-text transition-colors cursor-pointer">
            <IconX />
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* SKU */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wide">SKU *</label>
            <input
              name="sku"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="Ex: SABONETEIRA-P"
              className={`${inputCls} font-mono`}
            />
          </div>

          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wide">Nome *</label>
            <input
              name="name"
              required
              defaultValue={product?.name}
              placeholder="Ex: Saboneteira Pequena"
              className={inputCls}
            />
          </div>

          {/* Detalhes colapsável */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted uppercase tracking-wide hover:bg-surface transition-colors cursor-pointer"
            >
              Detalhes opcionais
              <span className={['transition-transform', showDetails ? 'rotate-180' : ''].join(' ')}>
                <IconChevron />
              </span>
            </button>

            {showDetails && (
              <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted uppercase tracking-wide">Custo (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted select-none">R$</span>
                      <input
                        name="cost_price"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={product?.cost_price ?? ''}
                        placeholder="0,00"
                        className={`${inputCls} pl-8`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted uppercase tracking-wide">Tempo (min)</label>
                    <input
                      name="avg_print_minutes"
                      type="number"
                      min="1"
                      defaultValue={product?.avg_print_minutes ?? ''}
                      placeholder="Ex: 120"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted uppercase tracking-wide">Plataforma</label>
                  <select name="platform" defaultValue={product?.platform ?? ''} className={selectCls}>
                    <option value="">Selecione</option>
                    {PLATFORM_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted uppercase tracking-wide">Notas</label>
                  <textarea
                    name="notes"
                    defaultValue={product?.notes ?? ''}
                    placeholder="Observações sobre o produto"
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm border border-border rounded-lg text-muted hover:bg-surface transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-accent text-bg font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {isPending && <Spinner size="sm" />}
              {isPending ? 'Salvando...' : product ? 'Atualizar' : 'Criar produto'}
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

function IconChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
