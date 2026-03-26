'use client'

import { useEffect, useRef, useState, useTransition, useMemo } from 'react'
import { updateTransaction } from '@/app/actions/transactions'
import { Spinner } from '@/components/ui/Spinner'
import type { Category, Transaction } from '@/lib/types'

const PLATFORM_OPTIONS = [
  { value: 'shopee',       label: 'Shopee' },
  { value: 'tiktok',       label: 'TikTok Shop' },
  { value: 'mercadolivre', label: 'Mercado Livre' },
  { value: 'direto',       label: 'Direto' },
  { value: 'outro',        label: 'Outro' },
]

const PAYMENT_OPTIONS = [
  { value: 'pix',           label: 'Pix' },
  { value: 'cartao',        label: 'Cartão' },
  { value: 'dinheiro',      label: 'Dinheiro' },
  { value: 'boleto',        label: 'Boleto' },
  { value: 'transferencia', label: 'Transferência' },
]

interface EditTransactionModalProps {
  transaction: Transaction
  categories: Category[]
  onClose: () => void
}

export function EditTransactionModal({
  transaction,
  categories,
  onClose,
}: EditTransactionModalProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [type, setType] = useState<'entrada' | 'saida'>(transaction.type)
  const [selectedCategoryId, setSelectedCategoryId] = useState(transaction.category_id ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const filtered = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  )
  const defaultCategories = filtered.filter((c) => c.is_default)
  const customCategories  = filtered.filter((c) => !c.is_default)
  const selectedCategory  = filtered.find((c) => c.id === selectedCategoryId)
  const showPlatform = selectedCategory?.name === 'Venda'

  function handleTypeChange(next: 'entrada' | 'saida') {
    setType(next)
    setSelectedCategoryId('')
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await updateTransaction(transaction.id, formData)
      if (result.success) {
        onClose()
      } else {
        setError(result.error ?? 'Erro inesperado')
      }
    })
  }

  const inputCls =
    'w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors'

  const selectCls =
    'w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors cursor-pointer'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-bg/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-text">Editar lançamento</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-text transition-colors"
            aria-label="Fechar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <input type="hidden" name="type" value={type} />

          {/* Toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(['entrada', 'saida'] as const).map((t) => {
              const active = type === t
              const isEntrada = t === 'entrada'
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={[
                    'flex items-center gap-2 p-3 rounded-xl border-2 transition-all duration-150 text-left',
                    active
                      ? isEntrada ? 'border-success bg-success-dim' : 'border-danger bg-danger-dim'
                      : 'border-border bg-surface hover:border-border-2',
                  ].join(' ')}
                >
                  <span className={['text-sm font-bold', active ? (isEntrada ? 'text-success' : 'text-danger') : 'text-muted'].join(' ')}>
                    {isEntrada ? '↑' : '↓'}
                  </span>
                  <span className={['text-sm font-semibold', active ? (isEntrada ? 'text-success' : 'text-danger') : 'text-text'].join(' ')}>
                    {isEntrada ? 'Entrada' : 'Saída'}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Descrição</label>
            <input name="description" required defaultValue={transaction.description} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Valor</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted select-none">R$</span>
                <input name="amount" type="number" step="0.01" min="0.01" required defaultValue={transaction.amount} className={`${inputCls} pl-9`} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Data</label>
              <input name="date" type="date" required defaultValue={transaction.date} className={inputCls} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Categoria</label>
            <select
              name="category_id"
              required
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className={selectCls}
            >
              <option value="" disabled>Selecione uma categoria</option>
              {defaultCategories.length > 0 && (
                <optgroup label="Categorias">
                  {defaultCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              )}
              {customCategories.length > 0 && (
                <optgroup label="Minhas categorias">
                  {customCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {showPlatform && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Plataforma</label>
              <select name="platform" defaultValue={transaction.platform ?? ''} className={selectCls}>
                <option value="">Selecione</option>
                {PLATFORM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Forma de pagamento</label>
            <select name="payment_method" defaultValue={transaction.payment_method ?? ''} className={selectCls}>
              <option value="">Opcional</option>
              {PAYMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-2 uppercase tracking-wide">SKU</label>
              <input name="sku" defaultValue={transaction.sku ?? ''} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Nota</label>
              <input name="notes" defaultValue={transaction.notes ?? ''} className={inputCls} />
            </div>
          </div>

          {error && (
            <p className="text-danger text-sm bg-danger-dim rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border text-muted hover:text-text hover:border-border-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-accent text-bg rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-accent-dim transition-colors disabled:opacity-50"
            >
              {isPending && <Spinner size="sm" />}
              {isPending ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
