'use client'

import { useRef, useState, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { parseUpsellerFile } from '@/lib/importers/upseller'
import { importPedidos } from '@/app/actions/transactions'
import type { UpsellerPedido } from '@/lib/importers/upseller'

// ── Formatação ────────────────────────────────────────────────────────────

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dt  = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

function fmtDate(iso: string) {
  try { return dt.format(new Date(iso)) } catch { return iso }
}

function num(s: string): number {
  return parseFloat(s.replace(',', '.')) || 0
}

const PLATFORM_LABEL: Record<string, string> = {
  shopee: 'Shopee', tiktok: 'TikTok', mercadolivre: 'Mercado Livre',
  direto: 'Direto', outro: 'Outro',
}

// ── Tipos ─────────────────────────────────────────────────────────────────

type Step       = 'upload' | 'preview' | 'done'
type FilterTab  = 'todos' | 'novos' | 'existentes'

interface PedidoOverride {
  valorBruto:   string
  valorLiquido: string
  desconto:     string
  trackingCode: string
}

interface ImportResult {
  success: number
  failed:  number
  errors:  string[]
}

function initOverride(p: UpsellerPedido): PedidoOverride {
  return {
    valorBruto:   String(p.valorBruto),
    valorLiquido: String(p.valorLiquido),
    desconto:     String(p.desconto),
    trackingCode: p.trackingCode,
  }
}

// Valores efetivos de um pedido com override aplicado
function effectiveOf(p: UpsellerPedido, ov: PedidoOverride) {
  const valorBruto   = num(ov.valorBruto)
  const desconto     = num(ov.desconto)
  const valorLiquido = num(ov.valorLiquido)
  const valorEntrada = valorBruto - desconto
  const taxaTotal    = valorEntrada - valorLiquido
  return { valorBruto, desconto, valorLiquido, valorEntrada, taxaTotal }
}

// ── Stepper ───────────────────────────────────────────────────────────────

function Stepper({ step }: { step: Step }) {
  const steps: Array<{ key: Step; label: string }> = [
    { key: 'upload',  label: 'Arquivo'   },
    { key: 'preview', label: 'Prévia'    },
    { key: 'done',    label: 'Concluído' },
  ]
  const idx = steps.findIndex((s) => s.key === step)
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-0">
          <div className="flex items-center gap-2">
            <div className={[
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
              i <= idx ? 'bg-accent text-bg' : 'bg-surface-2 text-muted border border-border',
            ].join(' ')}>
              {i < idx ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : i + 1}
            </div>
            <span className={['text-sm', i <= idx ? 'text-text font-medium' : 'text-muted'].join(' ')}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={['w-12 h-px mx-3', i < idx ? 'bg-accent' : 'bg-border'].join(' ')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── DropZone ──────────────────────────────────────────────────────────────

function DropZone({ onFile, loading }: { onFile: (f: File) => void; loading: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]; if (f) onFile(f)
  }, [onFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) onFile(f)
  }, [onFile])

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      disabled={loading}
      className={[
        'w-full rounded-xl border-2 border-dashed p-12 flex flex-col items-center gap-4 transition-colors duration-150 cursor-pointer disabled:opacity-50',
        dragging ? 'border-accent bg-accent-muted' : 'border-border hover:border-accent hover:bg-accent-muted',
      ].join(' ')}
    >
      {loading ? (
        <>
          <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span className="text-muted text-sm">Processando arquivo…</span>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-full bg-accent-muted flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="17 8 12 3 7 8" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="3" x2="12" y2="15" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-text font-medium">Arraste o arquivo do Upseller aqui</p>
            <p className="text-muted text-sm mt-1">ou clique para selecionar</p>
          </div>
          <span className="text-xs text-muted-2 bg-surface-2 px-3 py-1 rounded-full">Aceita: .xlsx</span>
        </>
      )}
      <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={handleChange} />
    </button>
  )
}

// ── Input inline ──────────────────────────────────────────────────────────

function FieldInput({
  label, value, onChange, type = 'number', placeholder, className = '',
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  type?: 'number' | 'text'
  placeholder?: string
  className?: string
}) {
  return (
    <label className={['flex items-center gap-1', className].join(' ')}>
      {label && <span className="text-muted-2 text-xs shrink-0">{label}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step="0.01"
        min={type === 'number' ? '0' : undefined}
        className="bg-surface border border-border rounded px-2 py-1 text-xs text-text w-24 tabular-nums focus:outline-none focus:border-accent transition-colors"
      />
    </label>
  )
}

// ── PedidoCardNovo (editável) ─────────────────────────────────────────────

function PedidoCardNovo({
  pedido, override, onChange,
}: {
  pedido: UpsellerPedido
  override: PedidoOverride
  onChange: (ov: PedidoOverride) => void
}) {
  const itemsLabel = pedido.items
    .map((i) => `${i.sku}${i.variacao ? ` | ${i.variacao}` : ''} x${i.quantidade}`)
    .join(' · ')

  const { taxaTotal } = effectiveOf(pedido, override)

  const taxaColor =
    taxaTotal > 0  ? 'text-danger'
    : taxaTotal < 0 ? 'text-warning'
    : 'text-muted'

  const taxaLabel =
    taxaTotal > 0  ? `Taxa: -${brl.format(taxaTotal)}`
    : taxaTotal < 0 ? `Revisar (${brl.format(taxaTotal)})`
    : 'Taxa: R$ 0,00'

  function set(field: keyof PedidoOverride) {
    return (v: string) => onChange({ ...override, [field]: v })
  }

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4 flex flex-col gap-3">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="w-2 h-2 rounded-full bg-accent shrink-0" aria-hidden="true" />
        <span className="text-text text-sm font-medium font-mono">{pedido.orderRef}</span>
        <span className="text-xs text-muted-2 bg-surface px-2 py-0.5 rounded-full">
          {PLATFORM_LABEL[pedido.platform] ?? pedido.platform}
        </span>
        <span className="text-xs text-muted ml-auto">{fmtDate(pedido.orderedAt)}</span>
      </div>

      {/* Itens */}
      <p className="text-xs text-muted truncate">{itemsLabel}</p>

      {/* Campos editáveis */}
      <div className="flex flex-wrap gap-3 items-end">
        <FieldInput
          label="Bruto R$"
          value={override.valorBruto}
          onChange={set('valorBruto')}
        />
        <FieldInput
          label="Líquido R$"
          value={override.valorLiquido}
          onChange={set('valorLiquido')}
          placeholder="Shopee paga"
        />
        <FieldInput
          label="Desc. R$"
          value={override.desconto}
          onChange={set('desconto')}
          className="w-20"
        />
        <FieldInput
          label="Rastreio"
          value={override.trackingCode}
          onChange={set('trackingCode')}
          type="text"
          placeholder="código"
          className="flex-1 min-w-0"
        />
      </div>

      {/* Taxa calculada (somente leitura) */}
      <p className={['text-xs font-medium', taxaColor].join(' ')}>
        {taxaLabel}
      </p>
    </div>
  )
}

// ── PedidoCardExistente (somente leitura) ─────────────────────────────────

function PedidoCardExistente({ pedido }: { pedido: UpsellerPedido }) {
  const itemsLabel = pedido.items
    .map((i) => `${i.sku}${i.variacao ? ` | ${i.variacao}` : ''} x${i.quantidade}`)
    .join(' · ')

  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-2 opacity-60">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="w-2 h-2 rounded-full bg-muted shrink-0" aria-hidden="true" />
        <span className="text-text text-sm font-medium font-mono">{pedido.orderRef}</span>
        <span className="text-xs text-muted-2 bg-surface-2 px-2 py-0.5 rounded-full">
          {PLATFORM_LABEL[pedido.platform] ?? pedido.platform}
        </span>
        <span className="text-xs text-muted ml-auto">{fmtDate(pedido.orderedAt)}</span>
        <span className="text-xs text-muted bg-surface-2 px-2 py-0.5 rounded-full border border-border">
          Já importado
        </span>
      </div>
      <p className="text-xs text-muted truncate">{itemsLabel}</p>
      <div className="flex items-center gap-4 text-xs flex-wrap">
        <span className="text-muted">Bruto: <span className="text-text">{brl.format(pedido.valorBruto)}</span></span>
        {pedido.taxas > 0 && (
          <span className="text-muted">Taxa: <span className="text-danger">-{brl.format(pedido.taxas)}</span></span>
        )}
        <span className="text-muted">Entrada: <span className="text-text">{brl.format(pedido.valorEntrada)}</span></span>
      </div>
    </div>
  )
}

// ── ResumoFooter (sticky) ─────────────────────────────────────────────────

function ResumoFooter({
  novos, overrides, isPending, onImport, onBack,
}: {
  novos:     UpsellerPedido[]
  overrides: Record<string, PedidoOverride>
  isPending: boolean
  onImport:  () => void
  onBack:    () => void
}) {
  let totalEntradas = 0
  let totalTaxas    = 0
  let totalLiquido  = 0

  for (const p of novos) {
    const ov = overrides[p.orderRef]
    if (!ov) continue
    const { valorEntrada, taxaTotal, valorLiquido } = effectiveOf(p, ov)
    totalEntradas += valorEntrada
    totalTaxas    += taxaTotal
    totalLiquido  += valorLiquido
  }

  return (
    <div className="mt-4 bg-surface border border-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
      <div className="flex flex-wrap gap-x-5 gap-y-1 flex-1 text-sm">
        <span className="text-muted">
          <span className="text-text font-medium">{novos.length}</span> pedidos
        </span>
        <span className="text-muted">
          Entradas: <span className="text-success font-medium">{brl.format(totalEntradas)}</span>
        </span>
        <span className="text-muted">
          Taxas: <span className="text-danger font-medium">-{brl.format(totalTaxas)}</span>
        </span>
        <span className="text-muted">
          Líquido: <span className="text-text font-medium">{brl.format(totalLiquido)}</span>
        </span>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm text-muted hover:text-text border border-border rounded-lg transition-colors"
        >
          ← Voltar
        </button>
        <button
          type="button"
          onClick={onImport}
          disabled={isPending || novos.length === 0}
          className="px-4 py-2 text-sm font-medium bg-accent text-bg rounded-lg hover:bg-accent-dim transition-colors disabled:opacity-50"
        >
          {isPending ? 'Importando…' : `Importar ${novos.length} pedidos →`}
        </button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────

export default function ImportarPage() {
  const [step,      setStep]      = useState<Step>('upload')
  const [pedidos,   setPedidos]   = useState<UpsellerPedido[]>([])
  const [existing,  setExisting]  = useState<Set<string>>(new Set())
  const [overrides, setOverrides] = useState<Record<string, PedidoOverride>>({})
  const [filter,    setFilter]    = useState<FilterTab>('todos')
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsing,   setParsing]   = useState(false)
  const [result,    setResult]    = useState<ImportResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const novos      = pedidos.filter((p) => !existing.has(p.orderRef))
  const existentes = pedidos.filter((p) =>  existing.has(p.orderRef))
  const filtered   = filter === 'novos' ? novos : filter === 'existentes' ? existentes : pedidos

  // ── Etapa 1: processar arquivo ──────────────────────────────────────────
  async function handleFile(file: File) {
    setParseError(null)
    setParsing(true)
    try {
      const buffer = await file.arrayBuffer()
      const parsed = parseUpsellerFile(buffer)

      if (parsed.length === 0) {
        setParseError('Nenhum pedido encontrado no arquivo.')
        return
      }

      const refs = parsed.map((p) => p.orderRef)
      const res  = await fetch('/api/importar/check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderRefs: refs }),
      })
      const json = await res.json() as { existing?: string[]; error?: string }
      if (!res.ok) { setParseError(json.error ?? 'Erro ao verificar duplicatas'); return }

      const initialOverrides: Record<string, PedidoOverride> = {}
      for (const p of parsed) initialOverrides[p.orderRef] = initOverride(p)

      setExisting(new Set(json.existing ?? []))
      setPedidos(parsed)
      setOverrides(initialOverrides)
      setFilter('todos')
      setStep('preview')
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Erro ao processar arquivo')
    } finally {
      setParsing(false)
    }
  }

  // ── Etapa 2: importar ───────────────────────────────────────────────────
  function handleImport() {
    startTransition(async () => {
      // Aplicar overrides antes de enviar
      const effectivePedidos = novos.map((p) => {
        const ov = overrides[p.orderRef]
        if (!ov) return p
        const { valorBruto, desconto, valorLiquido, valorEntrada, taxaTotal } = effectiveOf(p, ov)
        return {
          ...p,
          valorBruto,
          desconto,
          valorLiquido,
          valorEntrada,
          taxas:       taxaTotal,
          taxasManual: taxaTotal,   // server usa este valor, não recalcula
          trackingCode: ov.trackingCode,
        }
      })

      const res = await importPedidos(effectivePedidos)
      setResult(res)
      setStep('done')
    })
  }

  function handleReset() {
    setPedidos([]); setExisting(new Set()); setOverrides({})
    setResult(null); setParseError(null); setStep('upload')
  }

  function handleOverrideChange(orderRef: string, ov: PedidoOverride) {
    setOverrides((prev) => ({ ...prev, [orderRef]: ov }))
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-text mb-2">Importar pedidos</h1>
      <p className="text-muted text-sm mb-8">
        Importe pedidos do Upseller (.xlsx) diretamente para produção e lançamentos.
      </p>

      <Stepper step={step} />

      {/* ── Etapa 1: Upload ──────────────────────────────────────────────── */}
      {step === 'upload' && (
        <div>
          <DropZone onFile={handleFile} loading={parsing} />
          {parseError && (
            <p className="mt-4 text-sm text-danger bg-danger-dim px-4 py-3 rounded-lg">{parseError}</p>
          )}
        </div>
      )}

      {/* ── Etapa 2: Prévia ──────────────────────────────────────────────── */}
      {step === 'preview' && (
        <div>
          {/* Contagem */}
          <p className="text-text text-sm mb-4">
            <span className="font-semibold">{pedidos.length}</span> pedidos encontrados
            {' — '}
            <span className="text-success font-medium">{novos.length} novos</span>
            {', '}
            <span className="text-muted">{existentes.length} já existem</span>
          </p>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-surface p-1 rounded-lg w-fit">
            {(
              [
                { key: 'todos',      label: `Todos (${pedidos.length})`       },
                { key: 'novos',      label: `Novos (${novos.length})`         },
                { key: 'existentes', label: `Já existem (${existentes.length})` },
              ] as Array<{ key: FilterTab; label: string }>
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={[
                  'px-3 py-1.5 text-xs rounded-md transition-colors',
                  filter === key ? 'bg-surface-2 text-text font-medium' : 'text-muted hover:text-text',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Lista (altura limitada, scroll interno) */}
          <div className="overflow-y-auto flex flex-col gap-2" style={{ maxHeight: 'calc(100vh - 420px)', minHeight: '120px' }}>
            {filtered.map((pedido) =>
              existing.has(pedido.orderRef) ? (
                <PedidoCardExistente key={pedido.orderRef} pedido={pedido} />
              ) : (
                <PedidoCardNovo
                  key={pedido.orderRef}
                  pedido={pedido}
                  override={overrides[pedido.orderRef] ?? initOverride(pedido)}
                  onChange={(ov) => handleOverrideChange(pedido.orderRef, ov)}
                />
              ),
            )}
            {filtered.length === 0 && (
              <p className="text-muted text-sm text-center py-8">Nenhum pedido nesta categoria.</p>
            )}
          </div>

          {/* Footer com totais + botão importar */}
          <ResumoFooter
            novos={novos}
            overrides={overrides}
            isPending={isPending}
            onImport={handleImport}
            onBack={handleReset}
          />
        </div>
      )}

      {/* ── Etapa 3: Concluído ───────────────────────────────────────────── */}
      {step === 'done' && result && (
        <div className="flex flex-col items-center text-center gap-6">
          <div className={[
            'w-20 h-20 rounded-full flex items-center justify-center',
            result.failed === 0 ? 'bg-success-dim' : 'bg-warning/10',
          ].join(' ')}>
            {result.failed === 0 ? (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <polyline points="20 6 9 17 4 12" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          <p className="text-2xl font-semibold text-text">
            {result.failed === 0
              ? `${result.success} ${result.success === 1 ? 'pedido importado' : 'pedidos importados'} com sucesso!`
              : `${result.success} importados, ${result.failed} falharam`}
          </p>

          {result.errors.length > 0 && (
            <div className="w-full text-left bg-danger-dim border border-danger/20 rounded-xl p-4">
              <p className="text-danger text-sm font-medium mb-2">Pedidos com erro:</p>
              <ul className="space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-xs text-danger/80">{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/lancamentos" className="px-5 py-2.5 text-sm font-medium bg-accent text-bg rounded-lg hover:bg-accent-dim transition-colors">
              Ver lançamentos →
            </Link>
            <Link href="/producao" className="px-5 py-2.5 text-sm font-medium bg-surface-2 text-text border border-border rounded-lg hover:bg-surface transition-colors">
              Ver produção →
            </Link>
            <button type="button" onClick={handleReset} className="px-5 py-2.5 text-sm text-muted hover:text-text border border-border rounded-lg transition-colors">
              Importar outro arquivo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
