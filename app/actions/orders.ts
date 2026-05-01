'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { OrderSchema, OrderStatusSchema } from '@/lib/validations/order'
import { getPlatformLabel } from '@/lib/platform-fees'

export async function createOrder(
  data: unknown,
): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Não autenticado' }

  const parsed = OrderSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { items, tracking_code, ...orderData } = parsed.data

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({ ...orderData, tracking_code: tracking_code ?? null, user_id: user.id })
    .select('id')
    .single()

  if (orderError || !order) {
    return { success: false, error: orderError?.message ?? 'Erro ao criar pedido' }
  }

  const { error: itemsError } = await supabase.from('order_items').insert(
    items.map((item) => ({
      sku: item.sku,
      quantity: item.quantity,
      variant_id: item.variant_id ?? null,
      variant_attributes: item.variant_attributes ?? null,
      order_id: order.id,
    })),
  )

  if (itemsError) return { success: false, error: itemsError.message }

  revalidatePath('/producao')
  return { success: true, id: order.id }
}

export async function updateOrderStatus(
  id: string,
  status: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Não autenticado' }

  const parsed = OrderStatusSchema.safeParse(status)
  if (!parsed.success) {
    return { success: false, error: 'Status inválido' }
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: parsed.data })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/producao')
  return { success: true }
}

export async function addTrackingCode(
  id: string,
  trackingCode: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Não autenticado' }

  const { error } = await supabase
    .from('orders')
    .update({ tracking_code: trackingCode })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/producao')
  return { success: true }
}

export async function deleteOrder(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Não autenticado' }

  const { data: order } = await supabase
    .from('orders')
    .select('transaction_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  // Fetch the entrada transaction details before deleting the order
  let entrada: { description: string; date: string; platform: string | null } | null = null
  if (order?.transaction_id) {
    const { data } = await supabase
      .from('transactions')
      .select('description, date, platform')
      .eq('id', order.transaction_id)
      .single()
    entrada = data
  }

  // Delete the order (cascades order_items)
  const { error: orderError } = await supabase
    .from('orders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (orderError) return { success: false, error: orderError.message }

  if (order?.transaction_id && entrada) {
    // Delete the fee transaction (saída de taxa) if it exists
    const platformLabel = getPlatformLabel(entrada.platform)
    if (platformLabel) {
      await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id)
        .eq('description', `Taxa ${platformLabel} — ${entrada.description}`)
        .eq('category_name', 'Taxas plataforma')
        .eq('date', entrada.date)
    }

    // Delete the entrada transaction
    await supabase
      .from('transactions')
      .delete()
      .eq('id', order.transaction_id)
      .eq('user_id', user.id)
  }

  revalidatePath('/producao')
  revalidatePath('/lancamentos')
  revalidatePath('/dashboard')
  return { success: true }
}
