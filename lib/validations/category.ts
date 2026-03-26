import { z } from 'zod'

export const CategorySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  type: z.enum(['entrada', 'saida']),
  business_type: z
    .enum(['3d_printing', 'graphic', 'other'])
    .nullable()
    .optional(),
})

export type CategoryInput = z.infer<typeof CategorySchema>
