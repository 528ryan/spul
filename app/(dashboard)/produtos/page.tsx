import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductsClient } from '@/components/dashboard/ProductsClient'
import type { ProductWithVariants } from '@/lib/types'

export default async function ProdutosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .eq('user_id', user.id)
    .order('sku', { ascending: true })

  const products = (data ?? []) as ProductWithVariants[]

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      <ProductsClient products={products} />
    </div>
  )
}
