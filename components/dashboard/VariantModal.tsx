'use client'

import { useState, useTransition } from 'react'
import { createVariant, updateVariant } from '@/app/actions/products'
import { useToast } from '@/components/ui/ToastProvider'
import { Spinner } from '@/components/ui/Spinner'
import type { Product, ProductVariant } from '@/lib/types'

interface AttrPair {
  key: string
  value: string
}

interface VariantModalProps {
  product: Product
  variant?: ProductVariant
  onClose: () => void
}

export function VariantModal({ product, variant, onClose }: VariantModalProps) {
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  const [sku, setSku] = useState(variant?.sku ?? `${product.sku}-`)
  const [isActive, setIsActive] = useState(variant?.is_active ?? true)

  // Build initial attributes pairs
  const initAttrs: AttrPair[] = variant
    ? Object.entries(variant.attributes).map(([key, value]) => ({ key, value }))
    : [{ key: '', value: '' }]

  const [attrs, setAttrs] = useState<AttrPair[]>(initAttrs)

  function addAttr() {
    setAttrs((prev) => [...prev, { key: '', value: '' }])
  }

  function removeAttr(i: number) {
    setAttrs((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateAttr(i: number, field: 'key' | 'value', v: string) {
    setAttrs((prev) => prev.map((a, idx) => idx === i ? { ...a, [field]: v } : a))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    // Build attributes object from pairs (skip empty keys)
    const attributes: Record<string, string> = {}
    for (const pair of attrs) {
      if (pair.key.trim()) attributes[pair.key.trim()] = pair.value.trim()
    }

    const data = {
      sku,
      attributes,
      cost_price: formData.get('cost_price') ? Number(formData.get('cost_price')) : null,
      sale_price: formData.get('sale_price') ? Number(formData.get('sale_price')) : null,
      is_active: isActive,
    }

    startTransition(async () => {
      const res = variant
        ? await updateVariant(variant.id, data)
        : await createVariant(product.id, data)

      if (res.success) {
        showToast(variant ? 'Variação atualizada' : 'Variação criada', 'success')
        onClose()
      } else {
        showToast(res.error ?? 'Erro inesperado', 'error')
      }
    })
  }

  const inputCls =
    'w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-2 border border-border rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-text">
              {variant ? 'Editar variação' : 'Nova variação'}
            </h2>
            <p className="text-[11px] text-muted mt-0.5 font-mono">{product.sku} — {product.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-text transition-colors cursor-pointer">
            <IconX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* SKU */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wide">SKU da variação *</label>
            <input
              required
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder={`${product.sku}-BRANCO-G`}
              className={`${inputCls} font-mono`}
            />
            <p className="text-[10px] text-muted">Sugestão: {product.sku}-[atributos]</p>
          </div>

          {/* Attributes */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted uppercase tracking-wide">Atributos</label>
            {attrs.map((attr, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={attr.key}
                  onChange={(e) => updateAttr(i, 'key', e.target.value)}
                  placeholder="Nome (ex: Cor)"
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
                />
                <input
                  value={attr.value}
                  onChange={(e) => updateAttr(i, 'value', e.target.value)}
                  placeholder="Valor (ex: Branco)"
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
                />
                {attrs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAttr(i)}
                    className="text-muted hover:text-danger transition-colors cursor-pointer shrink-0"
                  >
                    <IconX size={14} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addAttr}
              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors cursor-pointer"
            >
              <IconPlus /> Adicionar atributo
            </button>
          </div>

          {/* Preços */}
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
                  defaultValue={variant?.cost_price ?? ''}
                  placeholder="0,00"
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wide">Preço venda (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted select-none">R$</span>
                <input
                  name="sale_price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={variant?.sale_price ?? ''}
                  placeholder="0,00"
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>
          </div>

          {/* Toggle ativo */}
          <div className="flex items-center justify-between py-2 border-t border-border">
            <span className="text-sm text-text">Variação ativa</span>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={[
                'relative w-10 h-5 rounded-full transition-colors cursor-pointer',
                isActive ? 'bg-accent' : 'bg-surface-2 border border-border',
              ].join(' ')}
            >
              <span className={[
                'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                isActive ? 'translate-x-5' : 'translate-x-0.5',
              ].join(' ')} />
            </button>
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
              {isPending ? 'Salvando...' : variant ? 'Atualizar' : 'Criar variação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function IconX({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
