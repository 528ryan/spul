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

// Shopee CNPJ — vigente desde 01/03/2026
function shopeeFeeCNPJ(gross: number, discount: number): FeeBreakdown {
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
): FeeBreakdown | null {
  switch (platform) {
    case 'shopee': return shopeeFeeCNPJ(gross, discount)
    case 'tiktok': return tiktokFee(gross, discount)
    default: return null
  }
}
