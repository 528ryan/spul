import { z } from 'zod'

const PLATFORM_VALUES = ['shopee', 'tiktok', 'mercadolivre', 'direto', 'outro'] as const
const PAYMENT_VALUES = ['pix', 'cartao', 'dinheiro', 'boleto', 'transferencia'] as const

export const TransactionSchema = z.object({
  type: z.enum(['entrada', 'saida']),
  description: z.string().min(1, 'Descrição obrigatória').max(200),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  category_id: z.string().uuid('Selecione uma categoria'),
  platform: z.enum(PLATFORM_VALUES).optional(),
  payment_method: z.enum(PAYMENT_VALUES).optional(),
  sku: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
  date: z.string().min(1, 'Data obrigatória'),
  gross_amount: z.coerce.number().optional(),
  discount: z.coerce.number().min(0).optional(),
  net_amount: z.coerce.number().optional(),
  platform_fee_pct: z.coerce.number().optional(),
  platform_fee_fixed: z.coerce.number().optional(),
  platform_fee_total: z.coerce.number().optional(),
  tracking_code: z.string().optional(),
})

export type TransactionInput = z.infer<typeof TransactionSchema>

// ── Schema para modo Pedido (multi-item) ──────────────────────────────────

export const PedidoItemSchema = z.object({
  sku: z.string().min(1, 'SKU obrigatório'),
  quantity: z.coerce.number().int().min(1, 'Quantidade mínima: 1'),
  unit_price: z.coerce.number().positive('Valor unitário deve ser positivo'),
  variant_id: z.string().uuid().nullable().optional(),
  variant_attributes: z.record(z.string(), z.string()).nullable().optional(),
})

export const PedidoSchema = z.object({
  category_id: z.string().uuid('Selecione uma categoria'),
  platform: z.enum(PLATFORM_VALUES).optional(),
  order_ref: z.string().optional(),
  ordered_at: z.string().min(1, 'Data do pedido obrigatória'),
  items: z.array(PedidoItemSchema).min(1, 'Adicione ao menos 1 item'),
  discount: z.coerce.number().min(0).default(0),
  payment_method: z.enum(PAYMENT_VALUES).optional(),
  tracking_code: z.string().optional(),
  notes: z.string().max(500).optional(),
})

export type PedidoInput = z.infer<typeof PedidoSchema>
