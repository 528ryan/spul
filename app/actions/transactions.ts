'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { TransactionSchema, PedidoSchema } from '@/lib/validations/transaction'
import { PLAN_LIMITS } from '@/lib/constants/plans'
import { calculatePlatformFee } from '@/lib/platform-fees'
import type { Platform } from '@/lib/platform-fees'

// ── helpers ───────────────────────────────────────────────────────────────

function currentMonthRange(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return {
    start: start.toISOString().slice(0, 10),
    end:   end.toISOString().slice(0, 10),
  }
}

function parseFormData(formData: FormData): Record<string, unknown> {
  return {
    type:               formData.get('type'),
    description:        formData.get('description'),
    amount:             formData.get('amount'),
    category_id:        formData.get('category_id'),
    platform:           formData.get('platform')       || undefined,
    payment_method:     formData.get('payment_method') || undefined,
    sku:                formData.get('sku')             || undefined,
    notes:              formData.get('notes')           || undefined,
    date:               formData.get('date'),
    gross_amount:       formData.get('gross_amount')       || undefined,
    discount:           formData.get('discount')           || undefined,
    net_amount:         formData.get('net_amount')         || undefined,
    platform_fee_pct:   formData.get('platform_fee_pct')   || undefined,
    platform_fee_fixed: formData.get('platform_fee_fixed') || undefined,
    platform_fee_total: formData.get('platform_fee_total') || undefined,
    tracking_code:      formData.get('tracking_code')      || undefined,
  }
}

// ── createTransaction ─────────────────────────────────────────────────────

export async function createTransaction(
  formData: FormData,
): Promise<{ success: boolean; error?: string; orderCreated?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  // Check plan limit (applies to all modes — 1 transaction per submit)
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  if (profile?.plan === 'free') {
    const { start, end } = currentMonthRange()
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('date', start)
      .lt('date', end)

    if (count !== null && count >= PLAN_LIMITS.free.transactions_per_month) {
      return {
        success: false,
        error: `Limite de ${PLAN_LIMITS.free.transactions_per_month} lançamentos/mês atingido. Atualize para Pro.`,
      }
    }
  }

  // ── MODO PEDIDO (multi-item) ──────────────────────────────────────────
  if (formData.get('_pedido_mode') === 'true') {
    const itemsRaw = formData.get('items') as string | null
    if (!itemsRaw) return { success: false, error: 'Itens do pedido não informados' }

    let itemsParsed: unknown
    try {
      itemsParsed = JSON.parse(itemsRaw)
    } catch {
      return { success: false, error: 'Formato de itens inválido' }
    }

    const pedidoInput = {
      category_id:    formData.get('category_id'),
      platform:       formData.get('platform')       || undefined,
      order_ref:      formData.get('order_ref')      || undefined,
      ordered_at:     formData.get('ordered_at'),
      items:          itemsParsed,
      discount:       formData.get('discount')       || '0',
      payment_method: formData.get('payment_method') || undefined,
      tracking_code:  formData.get('tracking_code') || undefined,
      notes:          formData.get('notes')          || undefined,
    }

    const parsed = PedidoSchema.safeParse(pedidoInput)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    // Fetch category for server-side integrity
    const { data: category } = await supabase
      .from('categories')
      .select('name')
      .eq('id', parsed.data.category_id)
      .single()
    if (!category) return { success: false, error: 'Categoria não encontrada' }

    // Calculate totals
    const grossAmount = parsed.data.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0,
    )
    const discount    = parsed.data.discount ?? 0
    const taxable     = Math.max(0, grossAmount - discount)
    const fee         = parsed.data.platform
      ? calculatePlatformFee(parsed.data.platform as Platform, taxable, 0)
      : null
    const netAmount   = fee ? fee.netAmount : taxable
    const orderRef    = parsed.data.order_ref ?? null
    const date        = parsed.data.ordered_at.slice(0, 10) // YYYY-MM-DD

    // Insert transaction
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id:            user.id,
        type:               'entrada',
        description:        orderRef || 'Pedido',
        amount:             netAmount,
        category_id:        parsed.data.category_id,
        category_name:      category.name,
        platform:           parsed.data.platform    ?? null,
        payment_method:     parsed.data.payment_method ?? null,
        tracking_code:      parsed.data.tracking_code  ?? null,
        notes:              parsed.data.notes          ?? null,
        date,
        gross_amount:       grossAmount,
        discount,
        net_amount:         netAmount,
        platform_fee_pct:   fee?.feePct   ?? null,
        platform_fee_fixed: fee?.feeFixed ?? null,
        platform_fee_total: fee?.feeTotal ?? null,
      })
      .select('id')
      .single()

    if (txError || !tx) {
      return { success: false, error: txError?.message ?? 'Erro ao registrar transação' }
    }

    // Insert order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id:        user.id,
        order_ref:      orderRef,
        platform:       parsed.data.platform    ?? null,
        status:         'received',
        transaction_id: tx.id,
        tracking_code:  parsed.data.tracking_code ?? null,
        notes:          parsed.data.notes          ?? null,
        ordered_at:     parsed.data.ordered_at,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      return { success: false, error: orderError?.message ?? 'Erro ao criar pedido na produção' }
    }

    // Insert order items
    const { error: itemsError } = await supabase.from('order_items').insert(
      parsed.data.items.map((item) => ({
        order_id:           order.id,
        sku:                item.sku,
        quantity:           item.quantity,
        variant_id:         item.variant_id         ?? null,
        variant_attributes: item.variant_attributes ?? null,
      })),
    )

    if (itemsError) return { success: false, error: itemsError.message }

    revalidatePath('/lancamentos')
    revalidatePath('/dashboard')
    revalidatePath('/producao')
    return { success: true, orderCreated: true }
  }

  // ── MODO NORMAL (lançamento único) ────────────────────────────────────
  const parsed = TransactionSchema.safeParse(parseFormData(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { data: category } = await supabase
    .from('categories')
    .select('name')
    .eq('id', parsed.data.category_id)
    .single()
  if (!category) return { success: false, error: 'Categoria não encontrada' }

  const { error } = await supabase.from('transactions').insert({
    ...parsed.data,
    category_name: category.name,
    user_id: user.id,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/lancamentos')
  revalidatePath('/dashboard')
  return { success: true }
}

// ── updateTransaction ─────────────────────────────────────────────────────

export async function updateTransaction(
  id: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const parsed = TransactionSchema.safeParse(parseFormData(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { data: category } = await supabase
    .from('categories')
    .select('name')
    .eq('id', parsed.data.category_id)
    .single()
  if (!category) return { success: false, error: 'Categoria não encontrada' }

  const { error } = await supabase
    .from('transactions')
    .update({ ...parsed.data, category_name: category.name })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/lancamentos')
  revalidatePath('/dashboard')
  return { success: true }
}

// ── deleteTransaction ─────────────────────────────────────────────────────

export async function deleteTransaction(
  id: string,
): Promise<{ success: boolean; error?: string; linkedOrder?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('transaction_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  if (order?.id) {
    await supabase
      .from('orders')
      .delete()
      .eq('id', order.id)
      .eq('user_id', user.id)
  }

  revalidatePath('/lancamentos')
  revalidatePath('/producao')
  revalidatePath('/dashboard')
  return { success: true, linkedOrder: !!order?.id }
}
