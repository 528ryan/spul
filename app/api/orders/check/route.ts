import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const orderRef = searchParams.get('order_ref')?.trim()

  if (!orderRef) {
    return NextResponse.json({ exists: false })
  }

  const { data } = await supabase
    .from('orders')
    .select('id')
    .eq('user_id', user.id)
    .eq('order_ref', orderRef)
    .maybeSingle()

  return NextResponse.json({ exists: !!data, orderId: data?.id ?? null })
}
