import { z } from 'zod'

export const OrderStatusSchema = z.enum([
  'received',
  'queued',
  'printed',
  'packed',
  'shipped',
])

export const OrderItemSchema = z.object({
  sku: z.string().min(1, 'SKU obrigatório'),
  quantity: z.number().int().positive('Quantidade deve ser > 0'),
  variant_id: z.string().uuid().nullable().optional(),
  variant_attributes: z.record(z.string(), z.string()).nullable().optional(),
})

export const OrderSchema = z.object({
  order_ref: z.string().nullable().optional(),
  platform: z
    .enum(['shopee', 'tiktok', 'mercadolivre', 'direto', 'outro'])
    .nullable()
    .optional(),
  tracking_code: z.string().nullable().optional(),
  status: OrderStatusSchema.default('received'),
  notes: z.string().max(500).nullable().optional(),
  transaction_id: z.string().uuid().nullable().optional(),
  items: z.array(OrderItemSchema).min(1, 'Pedido deve ter ao menos 1 item'),
})

export type OrderInput = z.infer<typeof OrderSchema>
export type OrderStatus = z.infer<typeof OrderStatusSchema>
