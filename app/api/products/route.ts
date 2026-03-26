import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ProductWithVariants } from '@/lib/types'

export async function GET(request: Request): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim().toLowerCase() ?? ''

  let query = supabase
    .from('products')
    .select('*, product_variants(*)')
    .eq('user_id', user.id)
    .order('sku', { ascending: true })

  if (q) {
    query = query.or(`sku.ilike.%${q}%,name.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ products: (data ?? []) as ProductWithVariants[] })
}
