'use client'

import { useRef, useState, useTransition, useMemo } from 'react'
import { createTransaction } from '@/app/actions/transactions'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/ToastProvider'
import { calculatePlatformFee } from '@/lib/platform-fees'
import { useProductSearch } from '@/lib/hooks/useProductSearch'
import { ProductAutocomplete } from '@/components/dashboard/ProductAutocomplete'
import { formatCurrency } from '@/lib/utils'
import type { Category, ProductVariant, ProductWithVariants } from '@/lib/types'
import type { Platform } from '@/lib/platform-fees'

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

const TODAY = new Date().toISOString().slice(0, 10)

function nowDateTimeLocal(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

// ── Pedido item state ─────────────────────────────────────────────────────

interface PedidoItemState {
  localId: string
  productSearch: string
  selectedProduct: ProductWithVariants | null
  selectedVariant: ProductVariant | null
  sku: string
  quantity: number
  unitPrice: string
  showSuggestions: boolean
}

function emptyPedidoItem(): PedidoItemState {
  return {
    localId: `${Date.now()}-${Math.random()}`,
    productSearch: '',
    selectedProduct: null,
    selectedVariant: null,
    sku: '',
    quantity: 1,
    unitPrice: '',
    showSuggestions: false,
  }
}

interface TransactionFormProps {
  categories: Category[]
}

export function TransactionForm({ categories }: TransactionFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  // ── Common state ───────────────────────────────────────────────────────
  const [type, setType] = useState<'entrada' | 'saida'>('entrada')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [platform, setPlatform] = useState('') // non-Pedido entradas
  const [normalSku, setNormalSku] = useState('')

  // ── Pedido mode state ──────────────────────────────────────────────────
  const [pedidoItems, setPedidoItems] = useState<PedidoItemState[]>([emptyPedidoItem()])
  const [pedidoPlatform, setPedidoPlatform] = useState('')
  const [pedidoOrderRef, setPedidoOrderRef] = useState('')
  const [pedidoOrderedAt, setPedidoOrderedAt] = useState(nowDateTimeLocal())
  const [pedidoDiscount, setPedidoDiscount] = useState('0')
  const [pedidoPaymentMethod, setPedidoPaymentMethod] = useState('')
  const [pedidoTrackingCode, setPedidoTrackingCode] = useState('')
  const [pedidoNotes, setPedidoNotes] = useState('')

  // shared product search (one instance for all pedido items)
  const { products: searchResults, search: searchProducts } = useProductSearch()

  // ── Derived values ─────────────────────────────────────────────────────
  const filtered = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  )
  const defaultCategories = filtered.filter((c) => c.is_default)
  const customCategories  = filtered.filter((c) => !c.is_default)
  const selectedCategory  = filtered.find((c) => c.id === selectedCategoryId)
  const isPedido = type === 'entrada' && selectedCategory?.name === 'Pedido'

  // Pedido faturamento (real-time)
  const pedidoSubtotal = pedidoItems.reduce(
    (sum, item) => sum + (Number(item.unitPrice) || 0) * item.quantity,
    0,
  )
  const pedidoDiscountNum = Number(pedidoDiscount) || 0
  const pedidoTaxable = Math.max(0, pedidoSubtotal - pedidoDiscountNum)
  const pedidoFee = useMemo(
    () => {
      if (!pedidoPlatform || pedidoTaxable <= 0) return null
      return calculatePlatformFee(pedidoPlatform as Platform, pedidoTaxable, 0)
    },
    [pedidoPlatform, pedidoTaxable],
  )
  const pedidoNet = pedidoFee ? pedidoFee.netAmount : pedidoTaxable

  // ── Pedido item management ─────────────────────────────────────────────
  function updateItem<K extends keyof PedidoItemState>(idx: number, field: K, value: PedidoItemState[K]) {
    setPedidoItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function handleItemSearch(idx: number, value: string) {
    setPedidoItems((prev) => prev.map((item, i) => {
      if (i !== idx) return { ...item, showSuggestions: false }
      return {
        ...item,
        productSearch: value,
        showSuggestions: value.length > 0,
        selectedProduct: value === '' ? null : item.selectedProduct,
        selectedVariant: value === '' ? null : item.selectedVariant,
        sku: value === '' ? '' : item.sku,
        unitPrice: value === '' ? '' : item.unitPrice,
      }
    }))
    if (value) void searchProducts(value)
  }

  function handleItemSelectProduct(idx: number, product: ProductWithVariants) {
    const activeVariants = product.product_variants.filter((v) => v.is_active)
    setPedidoItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item
      return {
        ...item,
        selectedProduct: product,
        productSearch: product.name,
        showSuggestions: false,
        sku: activeVariants.length === 0 ? product.sku : '',
        selectedVariant: null,
        unitPrice: item.unitPrice,
      }
    }))
  }

  function handleItemSelectVariant(idx: number, variantId: string) {
    setPedidoItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item
      const variant = (item.selectedProduct?.product_variants ?? []).find((v) => v.id === variantId) ?? null
      return {
        ...item,
        selectedVariant: variant,
        sku: variant?.sku ?? item.sku,
        unitPrice: variant?.sale_price != null ? String(variant.sale_price) : item.unitPrice,
      }
    }))
  }

  function addPedidoItem() {
    setPedidoItems((prev) => [...prev, emptyPedidoItem()])
  }

  function removePedidoItem(idx: number) {
    setPedidoItems((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── Reset helpers ──────────────────────────────────────────────────────
  function resetNormalForm() {
    formRef.current?.reset()
    setType('entrada')
    setSelectedCategoryId('')
    setPlatform('')
    setNormalSku('')
  }

  function resetPedidoForm() {
    setPedidoItems([emptyPedidoItem()])
    setPedidoPlatform('')
    setPedidoOrderRef('')
    setPedidoOrderedAt(nowDateTimeLocal())
    setPedidoDiscount('0')
    setPedidoPaymentMethod('')
    setPedidoTrackingCode('')
    setPedidoNotes('')
    setSelectedCategoryId('')
  }

  // ── Submit handlers ────────────────────────────────────────────────────
  function handleNormalSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createTransaction(formData)
      if (result.success) {
        resetNormalForm()
        showToast('Lançamento registrado', 'success')
      } else {
        showToast(result.error ?? 'Erro inesperado', 'error')
      }
    })
  }

  function handlePedidoSubmit() {
    const validItems = pedidoItems.filter(
      (item) => item.sku.trim() !== '' && Number(item.unitPrice) > 0,
    )
    if (validItems.length === 0) {
      showToast('Adicione ao menos 1 item com SKU e valor', 'error')
      return
    }

    const fd = new FormData()
    fd.set('_pedido_mode', 'true')
    fd.set('category_id', selectedCategoryId)
    fd.set('platform', pedidoPlatform)
    fd.set('order_ref', pedidoOrderRef)
    fd.set('ordered_at', pedidoOrderedAt)
    fd.set('discount', pedidoDiscount)
    fd.set('payment_method', pedidoPaymentMethod)
    fd.set('tracking_code', pedidoTrackingCode)
    fd.set('notes', pedidoNotes)
    fd.set('items', JSON.stringify(validItems.map((item) => ({
      sku: item.sku,
      quantity: item.quantity,
      unit_price: Number(item.unitPrice),
      variant_id: item.selectedVariant?.id ?? null,
      variant_attributes: item.selectedVariant?.attributes ?? null,
    }))))

    startTransition(async () => {
      const result = await createTransaction(fd)
      if (result.success) {
        resetPedidoForm()
        showToast('Pedido registrado e enviado para produção', 'success')
      } else {
        showToast(result.error ?? 'Erro inesperado', 'error')
      }
    })
  }

  // ── CSS classes ────────────────────────────────────────────────────────
  const inputCls =
    'w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors'
  const selectCls =
    'w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors cursor-pointer'
  const inputSmCls =
    'w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors'
  const selectSmCls =
    'w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors cursor-pointer'

  // ── Common: Type toggle + Category ─────────────────────────────────────
  function renderTypeAndCategory() {
    return (
      <>
        <input type="hidden" name="type" value={type} />
        <div className="grid grid-cols-2 gap-2">
          {(['entrada', 'saida'] as const).map((t) => {
            const active = type === t
            const isEntrada = t === 'entrada'
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t)
                  setSelectedCategoryId('')
                  setPlatform('')
                }}
                className={[
                  'flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all duration-150 text-left cursor-pointer',
                  active
                    ? isEntrada ? 'border-success bg-success-dim' : 'border-danger bg-danger-dim'
                    : 'border-border bg-surface hover:border-border-2 hover:bg-surface-2',
                ].join(' ')}
              >
                <span className={[
                  'w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shrink-0',
                  active
                    ? isEntrada ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                    : 'bg-surface-2 text-muted',
                ].join(' ')}>
                  {isEntrada ? '↑' : '↓'}
                </span>
                <div>
                  <p className={['text-sm font-semibold', active ? (isEntrada ? 'text-success' : 'text-danger') : 'text-text'].join(' ')}>
                    {isEntrada ? 'Entrada' : 'Saída'}
                  </p>
                  <p className="text-xs text-muted">{isEntrada ? 'Receita' : 'Despesa'}</p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Categoria</label>
          <select
            name="category_id"
            required={!isPedido}
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
      </>
    )
  }

  // ── Normal form body ────────────────────────────────────────────────────
  function renderNormalBody() {
    return (
      <>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Descrição</label>
          <input
            name="description"
            required
            placeholder={type === 'entrada' ? 'Ex: Serviço de impressão' : 'Ex: Filamento PLA 1kg'}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Valor</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted select-none">R$</span>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0,00"
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Data</label>
            <input name="date" type="date" required defaultValue={TODAY} className={inputCls} />
          </div>
        </div>

        {type === 'entrada' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Plataforma</label>
            <select name="platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className={selectCls}>
              <option value="">Opcional</option>
              {PLATFORM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Forma de pagamento</label>
          <select name="payment_method" className={selectCls}>
            <option value="">Opcional</option>
            {PAYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="relative flex items-center py-1">
          <div className="flex-1 h-px bg-border" />
          <span className="px-3 text-xs text-muted-2 uppercase tracking-wide">opcional</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-2 uppercase tracking-wide">SKU</label>
            <input type="hidden" name="sku" value={normalSku} />
            <ProductAutocomplete
              value={normalSku}
              onChange={setNormalSku}
              onSelect={(p) => setNormalSku(p.sku)}
              onClear={() => setNormalSku('')}
              placeholder="Ex: SABONETEIRA-P"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Nota</label>
            <input name="notes" placeholder="Observação" className={inputCls} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Código de rastreio</label>
          <input name="tracking_code" placeholder="Ex: BR123456789BR" className={inputCls} />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className={[
            'w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
            type === 'entrada'
              ? 'bg-success-dim border-success text-success hover:bg-success/20'
              : 'bg-danger-dim border-danger text-danger hover:bg-danger/20',
          ].join(' ')}
        >
          {isPending && <Spinner size="sm" />}
          {isPending ? 'Registrando...' : type === 'entrada' ? 'Registrar entrada →' : 'Registrar saída →'}
        </button>
      </>
    )
  }

  // ── Pedido items list ──────────────────────────────────────────────────
  function renderPedidoItems() {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Itens do pedido</label>
          <button
            type="button"
            onClick={addPedidoItem}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors cursor-pointer"
          >
            <IconPlus size={11} /> Adicionar item
          </button>
        </div>

        {pedidoItems.map((item, idx) => {
          const activeVariants = (item.selectedProduct?.product_variants ?? []).filter((v) => v.is_active)
          return (
            <div key={item.localId} className="bg-surface border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                {/* Product search */}
                <div className="flex-1 relative min-w-0">
                  <input
                    value={item.productSearch}
                    onChange={(e) => handleItemSearch(idx, e.target.value)}
                    onFocus={() => {
                      if (item.productSearch.length > 0) {
                        updateItem(idx, 'showSuggestions', true)
                        void searchProducts(item.productSearch)
                      }
                    }}
                    placeholder="Produto ou SKU..."
                    className={inputSmCls}
                    autoComplete="off"
                  />
                  {item.showSuggestions && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
                      {searchResults.slice(0, 5).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={() => handleItemSelectProduct(idx, p)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-2 transition-colors text-left cursor-pointer"
                        >
                          <span className="text-xs font-mono text-accent">{p.sku}</span>
                          <span className="text-xs text-muted truncate">{p.name}</span>
                          {p.product_variants.length > 0 && (
                            <span className="ml-auto text-[10px] text-muted shrink-0">{p.product_variants.length}v</span>
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
                  onChange={(e) => updateItem(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                  className="w-12 bg-surface border border-border rounded-lg px-2 py-2 text-xs text-text text-center focus:outline-none focus:ring-2 focus:ring-accent/40 shrink-0"
                  title="Quantidade"
                />

                {/* Unit price */}
                <div className="relative w-24 shrink-0">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted select-none">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg pl-7 pr-2 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>

                {/* Remove */}
                {pedidoItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePedidoItem(idx)}
                    className="text-muted hover:text-danger transition-colors cursor-pointer pt-2 shrink-0"
                  >
                    <IconX size={13} />
                  </button>
                )}
              </div>

              {/* Variant selector */}
              {item.selectedProduct && activeVariants.length > 0 && (
                <select
                  value={item.selectedVariant?.id ?? ''}
                  onChange={(e) => handleItemSelectVariant(idx, e.target.value)}
                  className={selectSmCls}
                >
                  <option value="">Selecione uma variação</option>
                  {activeVariants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.sku} — {Object.values(v.attributes).join(' | ')}
                      {v.sale_price != null ? ` · R$${v.sale_price.toFixed(2)}` : ''}
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
      </div>
    )
  }

  // ── Faturamento card (right column) ───────────────────────────────────
  function renderFaturamento() {
    const hasItems = pedidoItems.some((item) => item.sku || item.unitPrice)
    return (
      <div className="bg-surface-2 border border-border rounded-xl p-4 space-y-3 h-fit">
        <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">
          Faturamento do Pedido
        </p>

        {!hasItems ? (
          <p className="text-xs text-muted text-center py-6">
            Adicione itens para ver o faturamento
          </p>
        ) : (
          <>
            {/* Per-item breakdown */}
            <div className="space-y-1">
              {pedidoItems.map((item, idx) => {
                const lineTotal = (Number(item.unitPrice) || 0) * item.quantity
                if (!item.sku && !item.unitPrice) return null
                return (
                  <div key={item.localId} className="flex justify-between text-xs">
                    <span className="text-muted truncate max-w-[140px]">
                      {item.sku || `Item ${idx + 1}`}
                      {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                    </span>
                    <span className="text-text tabular-nums shrink-0 ml-2">
                      {formatCurrency(lineTotal)}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="border-t border-border pt-2 space-y-1.5">
              <div className="flex justify-between text-xs text-muted">
                <span>Subtotal bruto</span>
                <span className="tabular-nums">{formatCurrency(pedidoSubtotal)}</span>
              </div>

              {pedidoDiscountNum > 0 && (
                <div className="flex justify-between text-xs text-danger">
                  <span>Desconto</span>
                  <span className="tabular-nums">-{formatCurrency(pedidoDiscountNum)}</span>
                </div>
              )}

              {pedidoFee && (
                <>
                  <div className="flex justify-between text-xs text-muted">
                    <span>Valor taxável</span>
                    <span className="tabular-nums">{formatCurrency(pedidoTaxable)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-danger">
                    <span className="truncate max-w-[160px]">
                      Taxa {pedidoPlatform === 'shopee' ? 'Shopee' : 'TikTok'} ({pedidoFee.feeLabel})
                    </span>
                    <span className="tabular-nums shrink-0 ml-1">-{formatCurrency(pedidoFee.feeTotal)}</span>
                  </div>
                </>
              )}

              <div className="border-t border-border pt-2 flex justify-between items-baseline">
                <span className="text-xs text-text-2">Valor líquido estimado</span>
                <span className="text-lg font-bold text-success tabular-nums">
                  {formatCurrency(pedidoNet)}
                </span>
              </div>

              <p className="text-[10px] text-muted-2 italic">
                Estimado. Confira no painel da plataforma.
              </p>
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-surface border border-border rounded-xl">
      <form ref={formRef} action={handleNormalSubmit}>
        <div className="p-5 space-y-4">
          {/* Always: Type toggle + Category */}
          {renderTypeAndCategory()}
        </div>

        {isPedido ? (
          /* ── PEDIDO MODE: 2-column layout ──────────────────── */
          <div className="px-5 pb-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column: form fields */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-accent uppercase tracking-widest">
                Novo Pedido
              </p>

              {/* Platform */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-2 uppercase tracking-wide">
                  Plataforma <span className="text-danger">*</span>
                </label>
                <select
                  value={pedidoPlatform}
                  onChange={(e) => setPedidoPlatform(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Selecione a plataforma</option>
                  {PLATFORM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Order ref */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Nº do pedido</label>
                <input
                  value={pedidoOrderRef}
                  onChange={(e) => setPedidoOrderRef(e.target.value)}
                  placeholder="Ex: 25031234567"
                  className={inputCls}
                />
              </div>

              {/* Ordered at */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-2 uppercase tracking-wide">
                  Quando o cliente comprou <span className="text-danger">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={pedidoOrderedAt}
                  onChange={(e) => setPedidoOrderedAt(e.target.value)}
                  className={inputCls}
                />
                <p className="text-[10px] text-muted">Usado para calcular atraso na produção</p>
              </div>

              {/* Items */}
              {renderPedidoItems()}

              {/* Discount */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Desconto no pedido</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted select-none">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={pedidoDiscount}
                    onChange={(e) => setPedidoDiscount(e.target.value)}
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>

              {/* Payment method */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Forma de pagamento</label>
                <select
                  value={pedidoPaymentMethod}
                  onChange={(e) => setPedidoPaymentMethod(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Opcional</option>
                  {PAYMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Tracking code */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Código de rastreio</label>
                <input
                  value={pedidoTrackingCode}
                  onChange={(e) => setPedidoTrackingCode(e.target.value)}
                  placeholder="Ex: BR123456789BR"
                  className={inputCls}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-2 uppercase tracking-wide">Nota</label>
                <input
                  value={pedidoNotes}
                  onChange={(e) => setPedidoNotes(e.target.value)}
                  placeholder="Observação adicional"
                  className={inputCls}
                />
              </div>

              {/* Submit */}
              <button
                type="button"
                onClick={handlePedidoSubmit}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold bg-success-dim border border-success text-success hover:bg-success/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isPending && <Spinner size="sm" />}
                {isPending ? 'Registrando...' : 'Registrar pedido →'}
              </button>
            </div>

            {/* Right column: faturamento */}
            <div className="lg:sticky lg:top-4">
              {renderFaturamento()}
            </div>
          </div>
        ) : (
          /* ── NORMAL MODE: single column ────────────────────── */
          <div className="px-5 pb-5 space-y-4">
            {renderNormalBody()}
          </div>
        )}
      </form>
    </div>
  )
}

function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconX({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
