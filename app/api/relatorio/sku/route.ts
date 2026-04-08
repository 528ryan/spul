import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getMonthRange,
  getLast6Months,
  sixMonthsStartDate,
  sixMonthsStartISO,
  formatMonthShort,
} from '@/lib/date-helpers'

export async function GET(request: Request): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sku = searchParams.get('sku')
  const mes = searchParams.get('mes')

  if (!sku || !mes || !/^\d{4}-\d{2}$/.test(mes)) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  const range = getMonthRange(mes)
  const sixStart = sixMonthsStartDate(mes)
  const sixStartISO = sixMonthsStartISO(mes)
  const months = getLast6Months(mes)

  const [txResult, ordersResult, evo6Result] = await Promise.all([
    // Transactions with this SKU in the month (for revenue + pedidos count via distinct orders)
    supabase
      .from('transactions')
      .select('amount, description')
      .eq('user_id', user.id)
      .eq('sku', sku)
      .eq('type', 'entrada')
      .gte('date', range.start)
      .lte('date', range.end),

    // Recent orders containing this SKU
    supabase
      .from('orders')
      .select('id, platform, tracking_code, ordered_at, created_at, order_items!inner(sku, quantity)')
      .eq('user_id', user.id)
      .eq('order_items.sku', sku)
      .gte('ordered_at', range.startISO)
      .lt('ordered_at', range.endISO)
      .order('ordered_at', { ascending: false }),

    // 6-month evolution: transactions with this SKU
    supabase
      .from('transactions')
      .select('date, amount')
      .eq('user_id', user.id)
      .eq('sku', sku)
      .eq('type', 'entrada')
      .gte('date', sixStart),
  ])

  const txData = txResult.data ?? []
  const ordersData = ordersResult.data ?? []
  const evo6Data = evo6Result.data ?? []

  // Summary for the month
  const receita = txData.reduce((s, t) => s + (t.amount ?? 0), 0)
  const pedidos = ordersData.length

  // Quantity from order_items
  const quantidade = ordersData.reduce((sum, order) => {
    const items = order.order_items as { sku: string; quantity: number }[]
    return sum + items.filter((it) => it.sku === sku).reduce((s, it) => s + it.quantity, 0)
  }, 0)

  // 6-month evolution
  const evolution = months.map((m) => {
    const [y, mo] = m.split('-').map(Number)
    const start = `${m}-01`
    const lastDay = new Date(y, mo, 0).getDate()
    const endStr = `${m}-${String(lastDay).padStart(2, '0')}`
    const monthRev = evo6Data
      .filter((t) => t.date >= start && t.date <= endStr)
      .reduce((s, t) => s + (t.amount ?? 0), 0)
    return { mes: m, label: formatMonthShort(m), receita: monthRev }
  })

  // Recent orders (last 10) — shaped for the drawer
  const recentOrders = ordersData.slice(0, 10).map((order) => ({
    id: order.id,
    platform: order.platform,
    tracking_code: order.tracking_code,
    ordered_at: order.ordered_at,
    created_at: order.created_at,
  }))

  return NextResponse.json({
    summary: { pedidos, receita, quantidade },
    evolution,
    recentOrders,
  })
}
