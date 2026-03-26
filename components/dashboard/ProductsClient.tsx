'use client'

import { useState, useTransition } from 'react'
import { deleteProduct, deleteVariant, toggleVariantActive } from '@/app/actions/products'
import { ProductModal } from './ProductModal'
import { VariantModal } from './VariantModal'
import { useToast } from '@/components/ui/ToastProvider'
import { PLATFORM_LABELS } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import type { ProductVariant, ProductWithVariants } from '@/lib/types'

function formatAttrs(attrs: Record<string, string>): string {
  return Object.values(attrs).join(' | ')
}

interface ProductsClientProps {
  products: ProductWithVariants[]
}

export function ProductsClient({ products }: ProductsClientProps) {
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductWithVariants | undefined>()
  const [variantModal, setVariantModal] = useState<{
    product: ProductWithVariants
    variant?: ProductVariant
  } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  function openCreate() {
    setEditingProduct(undefined)
    setShowProductModal(true)
  }

  function openEdit(product: ProductWithVariants) {
    setEditingProduct(product)
    setShowProductModal(true)
  }

  function openNewVariant(product: ProductWithVariants) {
    setVariantModal({ product })
  }

  function openEditVariant(product: ProductWithVariants, variant: ProductVariant) {
    setVariantModal({ product, variant })
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  function handleDeleteProduct(id: string) {
    startTransition(async () => {
      const res = await deleteProduct(id)
      if (res.success) showToast('Produto removido', 'success')
      else showToast(res.error ?? 'Erro ao remover', 'error')
    })
  }

  function handleDeleteVariant(id: string) {
    startTransition(async () => {
      const res = await deleteVariant(id)
      if (res.success) showToast('Variação removida', 'success')
      else showToast(res.error ?? 'Erro ao remover', 'error')
    })
  }

  function handleToggleVariant(id: string, current: boolean) {
    startTransition(async () => {
      const res = await toggleVariantActive(id, !current)
      if (!res.success) showToast(res.error ?? 'Erro', 'error')
    })
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 className="text-xl font-semibold text-text">Produtos</h1>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent text-bg text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
        >
          <IconPlus />
          Novo produto
        </button>
      </div>

      {/* Grid */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mb-4">
            <IconCube />
          </div>
          <p className="text-sm font-medium text-text mb-1">Nenhum produto cadastrado</p>
          <p className="text-xs text-muted mb-4">Comece adicionando seus SKUs ao catálogo.</p>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 text-sm bg-accent text-bg font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            Adicionar primeiro produto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => {
            const variantCount = product.product_variants.length
            const isExpanded = expandedId === product.id

            return (
              <div
                key={product.id}
                className="bg-surface border border-border rounded-xl overflow-hidden hover:border-border-2 transition-colors"
              >
                {/* Card header — clickable to expand */}
                <div
                  className="p-4 cursor-pointer select-none"
                  onClick={() => toggleExpand(product.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-mono text-accent font-medium">{product.sku}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {variantCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-muted text-accent">
                          {variantCount} var.
                        </span>
                      )}
                      {product.platform && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-muted">
                          {PLATFORM_LABELS[product.platform] ?? product.platform}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm font-medium text-text mb-2">{product.name}</p>

                  <div className="flex items-center gap-3 text-xs text-muted">
                    {product.cost_price != null && (
                      <span>Custo: {formatCurrency(product.cost_price)}</span>
                    )}
                    {product.avg_print_minutes != null && (
                      <span>{product.avg_print_minutes}min</span>
                    )}
                    {variantCount > 0 && (
                      <span className="ml-auto text-[10px]">{isExpanded ? '▲ fechar' : '▼ variações'}</span>
                    )}
                  </div>
                </div>

                {/* Expanded variants */}
                {isExpanded && variantCount > 0 && (
                  <div className="border-t border-border bg-surface-2 divide-y divide-border">
                    {product.product_variants.map((variant) => (
                      <div key={variant.id} className="px-4 py-2.5 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono text-text-2 truncate">{variant.sku}</p>
                          <p className="text-[10px] text-muted">{formatAttrs(variant.attributes)}</p>
                          {(variant.cost_price != null || variant.sale_price != null) && (
                            <p className="text-[10px] text-muted mt-0.5">
                              {variant.cost_price != null && `Custo: ${formatCurrency(variant.cost_price)}`}
                              {variant.cost_price != null && variant.sale_price != null && ' · '}
                              {variant.sale_price != null && `Venda: ${formatCurrency(variant.sale_price)}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Active toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleVariant(variant.id, variant.is_active)}
                            disabled={isPending}
                            title={variant.is_active ? 'Desativar' : 'Ativar'}
                            className={[
                              'relative w-8 h-4 rounded-full transition-colors cursor-pointer disabled:opacity-40',
                              variant.is_active ? 'bg-success/50' : 'bg-surface border border-border',
                            ].join(' ')}
                          >
                            <span className={[
                              'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
                              variant.is_active ? 'translate-x-4' : 'translate-x-0.5',
                            ].join(' ')} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditVariant(product, variant)}
                            className="text-muted hover:text-text transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <IconPencil />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVariant(variant.id)}
                            disabled={isPending}
                            className="text-muted hover:text-danger transition-colors disabled:opacity-40 cursor-pointer"
                            title="Remover"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border">
                  <button
                    type="button"
                    onClick={() => openNewVariant(product)}
                    className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors cursor-pointer"
                  >
                    <IconPlus size={11} /> Variação
                  </button>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => openEdit(product)}
                      className="flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors cursor-pointer"
                    >
                      <IconPencil />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(product.id)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 text-xs text-muted hover:text-danger transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <IconTrash />
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => { setShowProductModal(false); setEditingProduct(undefined) }}
        />
      )}

      {/* Variant Modal */}
      {variantModal && (
        <VariantModal
          product={variantModal.product}
          variant={variantModal.variant}
          onClose={() => setVariantModal(null)}
        />
      )}
    </>
  )
}

function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconCube() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-muted">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function IconPencil() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
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
