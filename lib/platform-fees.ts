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
// Percentuais já incluem os 2,5% de campanha obrigatória
// Fórmula: valor × %faixa + taxa_fixa
export function shopeeFeeCNPJ(taxable: number, discount: number): FeeBreakdown {
  const valor = taxable - discount
  let feePct: number
  let feeFixed: number

  if (valor < 8) {
    feePct = 0.50;  feeFixed = 0
  } else if (valor <= 79.99) {
    feePct = 0.225; feeFixed = 4   // 20% + 2,5% campanha
  } else if (valor <= 99.99) {
    feePct = 0.165; feeFixed = 16  // 14% + 2,5% campanha
  } else if (valor <= 199.99) {
    feePct = 0.165; feeFixed = 20
  } else {
    feePct = 0.165; feeFixed = 26
  }

  const feeTotal = valor * feePct + feeFixed
  return {
    grossAmount:   taxable,
    discount,
    taxableAmount: valor,
    feePct,
    feeFixed,
    feeTotal:  round2(feeTotal),
    netAmount: round2(valor - feeTotal),
    feeLabel:  `${(feePct * 100).toFixed(1)}% + R$${feeFixed.toFixed(2)}`,
  }
}

// Taxa Shopee por 1 unidade (sem desconto — a taxa fixa é cobrada por unidade)
function shopeeFeeCNPJUnit(valorUnit: number): number {
  let feePct: number
  let feeFixed: number

  if (valorUnit < 8) {
    feePct = 0.50;  feeFixed = 0
  } else if (valorUnit <= 79.99) {
    feePct = 0.225; feeFixed = 4
  } else if (valorUnit <= 99.99) {
    feePct = 0.165; feeFixed = 16
  } else if (valorUnit <= 199.99) {
    feePct = 0.165; feeFixed = 20
  } else {
    feePct = 0.165; feeFixed = 26
  }

  return round2(valorUnit * feePct + feeFixed)
}

// Shopee multi-item: taxa calculada por unidade × quantidade
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
    const feeUnitaria = shopeeFeeCNPJUnit(item.valorUnitario)
    feeTotal += feeUnitaria * item.quantidade
  }

  const taxable = totalBruto - discount
  return {
    grossAmount:   totalBruto,
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
