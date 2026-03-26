import { z } from 'zod'

export const ProductSchema = z.object({
  sku: z.string().min(1, 'SKU obrigatório').max(50),
  name: z.string().min(1, 'Nome obrigatório').max(200),
  cost_price: z.number().positive().nullable().optional(),
  avg_print_minutes: z.number().int().positive().nullable().optional(),
  platform: z
    .enum(['shopee', 'tiktok', 'mercadolivre', 'direto', 'outro'])
    .nullable()
    .optional(),
  photo_url: z.string().url().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

export const VariantSchema = z.object({
  sku: z.string().min(1, 'SKU obrigatório').max(50).transform((v) => v.toUpperCase()),
  attributes: z.record(z.string(), z.string()),
  cost_price: z.coerce.number().positive().nullable().optional(),
  sale_price: z.coerce.number().positive().nullable().optional(),
  is_active: z.boolean().default(true),
})

export type ProductInput = z.infer<typeof ProductSchema>
export type VariantInput = z.infer<typeof VariantSchema>
