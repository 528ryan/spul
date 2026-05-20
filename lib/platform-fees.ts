export type Platform = 'shopee' | 'tiktok' | 'mercadolivre' | 'direto' | 'outro'

/** Retorna o label legível da plataforma para usar em descrições de transações. */
export function getPlatformLabel(platform: string | null | undefined): string {
  const labels: Record<string, string> = {
    shopee:       'Shopee',
    tiktok:       'TikTok Shop',
    mercadolivre: 'Mercado Livre',
  }
  return labels[platform ?? ''] ?? ''
}

export interface FeeBreakdown {
  grossAmount: number
  discount: number
  taxableAmount: number
  feePct: number
  feeFixed: number
  feeTotal: number
  netAmount: number
  feeLabel: string
}

export interface PedidoItem {
  valorUnitario: number
  quantidade: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Shopee CNPJ — vigente desde 01/03/2026
export function shopeeFeeCNPJ(gross: number, discount: number): FeeBreakdown {
  const taxable = gross - discount
  let feePct: number
  let feeFixed: number

  if (taxable <= 79.99) {
    feePct = 0.20; feeFixed = 4
  } else if (taxable <= 99.99) {
    feePct = 0.14; feeFixed = 16
  } else if (taxable <= 199.99) {
    feePct = 0.14; feeFixed = 20
  } else {
    feePct = 0.14; feeFixed = 26
  }

  const feeTotal = taxable * feePct + feeFixed
  return {
    grossAmount: gross,
    discount,
    taxableAmount: taxable,
    feePct,
    feeFixed,
    feeTotal,
    netAmount: taxable - feeTotal,
    feeLabel: `${(feePct * 100).toFixed(0)}% + R$${feeFixed.toFixed(2)}`,
  }
}

// Shopee multi-item: calcula taxa por unidade de cada item
export function calculateShopeeFeePorItens(
  items: PedidoItem[],
  discount: number = 0,
): FeeBreakdown {
  const totalBruto = items.reduce(
    (sum, i) => sum + i.valorUnitario * i.quantidade,
    0,
  )

  let feeTotal = 0

  for (const item of items) {
    const proporcao       = (item.valorUnitario * item.quantidade) / totalBruto
    const descontoItem    = discount * proporcao
    const valorUnitLiquido = item.valorUnitario - descontoItem / item.quantidade

    const feeUnitaria = shopeeFeeCNPJ(valorUnitLiquido, 0)
    feeTotal += feeUnitaria.feeTotal * item.quantidade
  }

  const taxable = totalBruto - discount
  return {
    grossAmount:  totalBruto,
    discount,
    taxableAmount: taxable,
    feePct:   0,
    feeFixed: 0,
    feeTotal: round2(feeTotal),
    netAmount: round2(taxable - feeTotal),
    feeLabel: 'por item',
  }
}

// TikTok Shop
function tiktokFee(gross: number, discount: number): FeeBreakdown {
  const taxable = gross - discount
  const feePct = 0.06
  const feeFixed = taxable < 79 ? 2 : 0
  const feeTotal = Math.min(taxable * feePct + feeFixed, 50)
  return {
    grossAmount: gross,
    discount,
    taxableAmount: taxable,
    feePct,
    feeFixed,
    feeTotal,
    netAmount: taxable - feeTotal,
    feeLabel: taxable < 79 ? '6% + R$2,00' : '6%',
  }
}

export function calculatePlatformFee(
  platform: Platform,
  gross: number,
  discount: number = 0,
  items?: PedidoItem[],
): FeeBreakdown | null {
  if (platform === 'shopee') {
    if (items && items.length > 1) {
      return calculateShopeeFeePorItens(items, discount)
    }
    return shopeeFeeCNPJ(gross - discount, 0) // 1 item: comportamento atual
  }
  if (platform === 'tiktok') return tiktokFee(gross, discount)
  return null
}
