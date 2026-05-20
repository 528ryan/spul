import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body: unknown = await req.json()
  if (
    !body ||
    typeof body !== 'object' ||
    !('orderRefs' in body) ||
    !Array.isArray((body as { orderRefs: unknown }).orderRefs)
  ) {
    return NextResponse.json({ error: 'Parâmetro orderRefs inválido' }, { status: 400 })
  }

  const orderRefs = (body as { orderRefs: string[] }).orderRefs.filter(
    (r) => typeof r === 'string',
  )

  if (orderRefs.length === 0) {
    return NextResponse.json({ existing: [] })
  }

  const { data, error } = await supabase
    .from('orders')
    .select('order_ref')
    .eq('user_id', user.id)
    .in('order_ref', orderRefs)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const existing = (data ?? [])
    .map((row) => row.order_ref)
    .filter((ref): ref is string => ref !== null)

  return NextResponse.json({ existing })
}
