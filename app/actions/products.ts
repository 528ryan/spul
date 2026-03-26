'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ProductSchema, VariantSchema } from '@/lib/validations/product'

// ── helpers ───────────────────────────────────────────────────────────────

function parseProductRaw(formData: FormData) {
  return {
    sku: formData.get('sku'),
    name: formData.get('name'),
    cost_price: formData.get('cost_price') ? Number(formData.get('cost_price')) : null,
    avg_print_minutes: formData.get('avg_print_minutes')
      ? Number(formData.get('avg_print_minutes'))
      : null,
    platform: formData.get('platform') || null,
    photo_url: formData.get('photo_url') || null,
    notes: formData.get('notes') || null,
  }
}

// ── products ──────────────────────────────────────────────────────────────

export async function createProduct(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const parsed = ProductSchema.safeParse(parseProductRaw(formData))
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { error } = await supabase
    .from('products')
    .insert({ ...parsed.data, user_id: user.id })

  if (error) return { success: false, error: error.message }

  revalidatePath('/produtos')
  return { success: true }
}

export async function updateProduct(
  id: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const parsed = ProductSchema.safeParse(parseProductRaw(formData))
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { error } = await supabase
    .from('products')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/produtos')
  return { success: true }
}

export async function deleteProduct(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/produtos')
  return { success: true }
}

// ── variants ──────────────────────────────────────────────────────────────

export async function createVariant(
  productId: string,
  data: unknown,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const parsed = VariantSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { error } = await supabase
    .from('product_variants')
    .insert({ ...parsed.data, product_id: productId, user_id: user.id })

  if (error) return { success: false, error: error.message }

  revalidatePath('/produtos')
  return { success: true }
}

export async function updateVariant(
  id: string,
  data: unknown,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const parsed = VariantSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { error } = await supabase
    .from('product_variants')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/produtos')
  return { success: true }
}

export async function deleteVariant(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const { error } = await supabase
    .from('product_variants')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/produtos')
  return { success: true }
}

export async function toggleVariantActive(
  id: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const { error } = await supabase
    .from('product_variants')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/produtos')
  return { success: true }
}
