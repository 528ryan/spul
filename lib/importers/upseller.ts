import * as XLSX from 'xlsx'
import { calculatePlatformFee } from '@/lib/platform-fees'
import type { Platform } from '@/lib/platform-fees'

export interface UpsellerRow {
  orderRef: string
  platform: string
  orderedAt: string
  sku: string
  variacao: string
  quantidade: number
  valorProduto: number
  valorPedido: number
  desconto: number
  trackingCode: string
}

export interface UpsellerPedido {
  orderRef: string
  platform: Platform
  orderedAt: string        // ISO string
  trackingCode: string
  items: Array<{
    sku: string
    variacao: string
    quantidade: number
    valorUnitario: number
  }>
  valorBruto: number
  desconto: number
  taxas: number
  valorEntrada: number     // bruto - desconto
  valorLiquido: number     // bruto - desconto - taxas
}

function normalizePlatform(raw: string): Platform {
  const lower = raw.toLowerCase()
  if (lower.includes('shopee')) return 'shopee'
  if (lower.includes('tiktok') || lower.includes('tik tok')) return 'tiktok'
  if (lower.includes('mercado')) return 'mercadolivre'
  return 'outro'
}

function parseUpsellerDate(raw: string): string {
  // Formato: "2026-05-19 18:08:08" — interpretar como BRT (UTC-3)
  const d = new Date(raw + '-03:00')
  return d.toISOString()
}

function toNumber(val: unknown): number {
  if (typeof val === 'number') return val
  if (typeof val === 'string') return parseFloat(val.replace(',', '.')) || 0
  return 0
}

export function parseUpsellerFile(buffer: ArrayBuffer): UpsellerPedido[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

  const grouped = new Map<string, UpsellerRow[]>()

  for (const row of rows) {
    const orderRef = String(row['Nº de Pedido da Plataforma'] ?? '').trim()
    if (!orderRef) continue

    const parsed: UpsellerRow = {
      orderRef,
      platform: String(row['Plataformas'] ?? ''),
      orderedAt: String(row['Hora do Pagamento'] ?? row['Hora do Pedido'] ?? ''),
      sku: String(row['SKU'] ?? '').trim().toUpperCase(),
      variacao: String(row['Variação'] ?? '').trim(),
      quantidade: toNumber(row['Qtd. do Produto'] ?? 1),
      valorProduto: toNumber(row['Preço de Produto'] ?? 0),
      valorPedido: toNumber(row['Valor do Pedido'] ?? 0),
      desconto: toNumber(row['Descontos e Cupons'] ?? 0),
      trackingCode: String(row['Nº de Rastreio'] ?? '').trim(),
    }

    if (!grouped.has(orderRef)) grouped.set(orderRef, [])
    grouped.get(orderRef)!.push(parsed)
  }

  const pedidos: UpsellerPedido[] = []

  for (const [orderRef, linhas] of grouped) {
    const primeira = linhas[0]
    const platform = normalizePlatform(primeira.platform)

    const items = linhas.map((l) => ({
      sku: l.sku,
      variacao: l.variacao,
      quantidade: l.quantidade,
      valorUnitario: l.valorProduto,
    }))

    const valorBruto = items.reduce(
      (sum, i) => sum + i.valorUnitario * i.quantidade,
      0,
    )
    const desconto = primeira.desconto
    const valorEntrada = Math.max(0, valorBruto - desconto)

    const fee = calculatePlatformFee(platform, valorBruto, desconto, items)
    const taxas = fee?.feeTotal ?? 0

    pedidos.push({
      orderRef,
      platform,
      orderedAt: parseUpsellerDate(primeira.orderedAt),
      trackingCode: primeira.trackingCode,
      items,
      valorBruto,
      desconto,
      taxas,
      valorEntrada,
      valorLiquido: valorEntrada - taxas,
    })
  }

  return pedidos
}
