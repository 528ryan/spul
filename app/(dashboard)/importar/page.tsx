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

const PLATFORM_LABEL: Record<string, string> = {
  shopee: 'Shopee',
  tiktok: 'TikTok',
  mercadolivre: 'Mercado Livre',
  direto: 'Direto',
  outro: 'Outro',
}

// ── Tipos ─────────────────────────────────────────────────────────────────

type Step = 'upload' | 'preview' | 'done'
type FilterTab = 'todos' | 'novos' | 'existentes'

interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

// ── Stepper ───────────────────────────────────────────────────────────────

function Stepper({ step }: { step: Step }) {
  const steps: Array<{ key: Step; label: string }> = [
    { key: 'upload',  label: 'Arquivo' },
    { key: 'preview', label: 'Prévia'  },
    { key: 'done',    label: 'Concluído' },
  ]
  const idx = steps.findIndex((s) => s.key === step)

  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-0">
          <div className="flex items-center gap-2">
            <div
              className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                i < idx  ? 'bg-accent text-bg'                    : '',
                i === idx ? 'bg-accent text-bg'                   : '',
                i > idx  ? 'bg-surface-2 text-muted border border-border' : '',
              ].join(' ')}
            >
              {i < idx ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className={[
              'text-sm',
              i <= idx ? 'text-text font-medium' : 'text-muted',
            ].join(' ')}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={[
              'w-12 h-px mx-3',
              i < idx ? 'bg-accent' : 'bg-border',
            ].join(' ')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── DropZone ──────────────────────────────────────────────────────────────

interface DropZoneProps {
  onFile: (file: File) => void
  loading: boolean
}

function DropZone({ onFile, loading }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFile(file)
    },
    [onFile],
  )

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
        dragging
          ? 'border-accent bg-accent-muted'
          : 'border-border hover:border-accent hover:bg-accent-muted',
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
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent" style={{ color: 'var(--color-accent)' }} />
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
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleChange}
      />
    </button>
  )
}

// ── PedidoCard ────────────────────────────────────────────────────────────

function PedidoCard({
  pedido,
  isExisting,
}: {
  pedido: UpsellerPedido
  isExisting: boolean
}) {
  const itemsLabel = pedido.items
    .map((i) => `${i.sku}${i.variacao ? ` | ${i.variacao}` : ''} x${i.quantidade}`)
    .join(' · ')

  return (
    <div
      className={[
        'rounded-xl border p-4 flex flex-col gap-2 transition-opacity',
        isExisting
          ? 'bg-surface border-border opacity-60'
          : 'bg-surface-2 border-border',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={[
            'w-2 h-2 rounded-full shrink-0',
            isExisting ? 'bg-muted' : 'bg-accent',
          ].join(' ')}
          aria-hidden="true"
        />
        <span className="text-text text-sm font-medium font-mono">{pedido.orderRef}</span>
        <span className="text-xs text-muted-2 bg-surface px-2 py-0.5 rounded-full">
          {PLATFORM_LABEL[pedido.platform] ?? pedido.platform}
        </span>
        <span className="text-xs text-muted ml-auto">{fmtDate(pedido.orderedAt)}</span>
        {isExisting && (
          <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded-full border border-border">
            Já importado
          </span>
        )}
      </div>

      <p className="text-xs text-muted truncate">{itemsLabel}</p>

      <div className="flex items-center gap-4 text-xs flex-wrap">
        <span className="text-muted">
          Bruto: <span className="text-text">{brl.format(pedido.valorBruto)}</span>
        </span>
        {pedido.taxas > 0 && (
          <span className="text-muted">
            Taxa: <span className="text-danger">-{brl.format(pedido.taxas)}</span>
          </span>
        )}
        <span className="text-muted">
          Entrada: <span className="text-success font-medium">{brl.format(pedido.valorEntrada)}</span>
        </span>
        {pedido.trackingCode && (
          <span className="text-muted ml-auto truncate">
            Rastreio: <span className="text-text-2">{pedido.trackingCode}</span>
          </span>
        )}
      </div>
    </div>
  )
}

// ── ResumoRodape ──────────────────────────────────────────────────────────

function ResumoRodape({ pedidos }: { pedidos: UpsellerPedido[] }) {
  const totalEntradas = pedidos.reduce((s, p) => s + p.valorEntrada, 0)
  const totalTaxas    = pedidos.reduce((s, p) => s + p.taxas, 0)
  const totalLiquido  = pedidos.reduce((s, p) => s + p.valorLiquido, 0)

  if (pedidos.length === 0) return null

  return (
    <div className="mt-4 p-4 bg-surface rounded-xl border border-border text-sm flex flex-wrap gap-x-6 gap-y-1">
      <span className="text-muted">
        Total a importar: <span className="text-text font-medium">{pedidos.length} pedidos</span>
      </span>
      <span className="text-muted">
        Entradas: <span className="text-success font-medium">{brl.format(totalEntradas)}</span>
      </span>
      {totalTaxas > 0 && (
        <span className="text-muted">
          Taxas: <span className="text-danger font-medium">-{brl.format(totalTaxas)}</span>
        </span>
      )}
      <span className="text-muted">
        Líquido: <span className="text-text font-medium">{brl.format(totalLiquido)}</span>
      </span>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────

export default function ImportarPage() {
  const [step, setStep]             = useState<Step>('upload')
  const [pedidos, setPedidos]       = useState<UpsellerPedido[]>([])
  const [existing, setExisting]     = useState<Set<string>>(new Set())
  const [filter, setFilter]         = useState<FilterTab>('todos')
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsing, setParsing]       = useState(false)
  const [result, setResult]         = useState<ImportResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const novos      = pedidos.filter((p) => !existing.has(p.orderRef))
  const existentes = pedidos.filter((p) =>  existing.has(p.orderRef))

  const filtered =
    filter === 'novos'      ? novos
    : filter === 'existentes' ? existentes
    : pedidos

  // ── Etapa 1: processar arquivo ──────────────────────────────────────────
  async function handleFile(file: File) {
    setParseError(null)
    setParsing(true)
    try {
      const buffer    = await file.arrayBuffer()
      const parsed    = parseUpsellerFile(buffer)

      if (parsed.length === 0) {
        setParseError('Nenhum pedido encontrado no arquivo.')
        return
      }

      // Verificar duplicatas
      const refs = parsed.map((p) => p.orderRef)
      const res  = await fetch('/api/importar/check', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orderRefs: refs }),
      })
      const json = await res.json() as { existing?: string[]; error?: string }

      if (!res.ok) {
        setParseError(json.error ?? 'Erro ao verificar duplicatas')
        return
      }

      setExisting(new Set(json.existing ?? []))
      setPedidos(parsed)
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
      const res = await importPedidos(novos)
      setResult(res)
      setStep('done')
    })
  }

  // ── Etapa 3: reiniciar ──────────────────────────────────────────────────
  function handleReset() {
    setPedidos([])
    setExisting(new Set())
    setResult(null)
    setParseError(null)
    setStep('upload')
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-text mb-2">Importar pedidos</h1>
      <p className="text-muted text-sm mb-8">Importe pedidos do Upseller (.xlsx) diretamente para produção e lançamentos.</p>

      <Stepper step={step} />

      {/* ── Etapa 1: Upload ────────────────────────────────────────────── */}
      {step === 'upload' && (
        <div>
          <DropZone onFile={handleFile} loading={parsing} />
          {parseError && (
            <p className="mt-4 text-sm text-danger bg-danger-dim px-4 py-3 rounded-lg">{parseError}</p>
          )}
        </div>
      )}

      {/* ── Etapa 2: Prévia ────────────────────────────────────────────── */}
      {step === 'preview' && (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <p className="text-text text-sm">
              <span className="font-semibold">{pedidos.length}</span> pedidos encontrados
              {' — '}
              <span className="text-success font-medium">{novos.length} novos</span>
              {', '}
              <span className="text-muted">{existentes.length} já existem</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-sm text-muted hover:text-text border border-border rounded-lg transition-colors"
              >
                ← Voltar
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={isPending || novos.length === 0}
                className="px-4 py-2 text-sm font-medium bg-accent text-bg rounded-lg hover:bg-accent-dim transition-colors disabled:opacity-50"
              >
                {isPending ? 'Importando…' : `Importar ${novos.length} novos →`}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-surface p-1 rounded-lg w-fit">
            {(
              [
                { key: 'todos',      label: `Todos (${pedidos.length})` },
                { key: 'novos',      label: `Novos (${novos.length})` },
                { key: 'existentes', label: `Já existem (${existentes.length})` },
              ] as Array<{ key: FilterTab; label: string }>
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={[
                  'px-3 py-1.5 text-xs rounded-md transition-colors',
                  filter === key
                    ? 'bg-surface-2 text-text font-medium'
                    : 'text-muted hover:text-text',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Lista */}
          <div className="flex flex-col gap-2">
            {filtered.map((pedido) => (
              <PedidoCard
                key={pedido.orderRef}
                pedido={pedido}
                isExisting={existing.has(pedido.orderRef)}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-muted text-sm text-center py-8">Nenhum pedido nesta categoria.</p>
            )}
          </div>

          {/* Resumo rodapé — apenas novos */}
          <ResumoRodape pedidos={novos} />
        </div>
      )}

      {/* ── Etapa 3: Concluído ─────────────────────────────────────────── */}
      {step === 'done' && result && (
        <div className="flex flex-col items-center text-center gap-6">
          <div className={[
            'w-20 h-20 rounded-full flex items-center justify-center',
            result.failed === 0 ? 'bg-success-dim' : 'bg-warning/10',
          ].join(' ')}>
            {result.failed === 0 ? (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          <div>
            {result.failed === 0 ? (
              <p className="text-2xl font-semibold text-text">
                {result.success} {result.success === 1 ? 'pedido importado' : 'pedidos importados'} com sucesso!
              </p>
            ) : (
              <p className="text-2xl font-semibold text-text">
                {result.success} importados, {result.failed} falharam
              </p>
            )}
          </div>

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
            <Link
              href="/lancamentos"
              className="px-5 py-2.5 text-sm font-medium bg-accent text-bg rounded-lg hover:bg-accent-dim transition-colors"
            >
              Ver lançamentos →
            </Link>
            <Link
              href="/producao"
              className="px-5 py-2.5 text-sm font-medium bg-surface-2 text-text border border-border rounded-lg hover:bg-surface transition-colors"
            >
              Ver produção →
            </Link>
            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-2.5 text-sm text-muted hover:text-text border border-border rounded-lg transition-colors"
            >
              Importar outro arquivo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
