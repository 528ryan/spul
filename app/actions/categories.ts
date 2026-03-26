'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { CategorySchema } from '@/lib/validations/category'

export async function createCategory(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Não autenticado' }

  const raw = {
    name: formData.get('name'),
    type: formData.get('type'),
    business_type: formData.get('business_type') || null,
  }

  const parsed = CategorySchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { error } = await supabase
    .from('categories')
    .insert({ ...parsed.data, user_id: user.id, is_default: false })

  if (error) return { success: false, error: error.message }

  revalidatePath('/lancamentos')
  return { success: true }
}
