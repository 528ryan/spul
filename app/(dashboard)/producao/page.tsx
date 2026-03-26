import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProducaoClient } from '@/components/dashboard/ProducaoClient'
import type { Order } from '@/lib/types'

const ACTIVE_STATUSES = ['received', 'queued', 'printed', 'packed'] as const
type ActiveStatus = typeof ACTIVE_STATUSES[number]

export default async function ProducaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Active orders sorted by ordered_at ASC (oldest = most urgent), nulls last
  const { data: activeData } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', user.id)
    .in('status', [...ACTIVE_STATUSES])
    .order('ordered_at', { ascending: true, nullsFirst: false })

  // Recent shipped (last 10, newest first)
  const { data: shippedData } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', user.id)
    .eq('status', 'shipped')
    .order('updated_at', { ascending: false })
    .limit(10)

  const activeOrders = (activeData ?? []) as Order[]
  const shippedOrders = (shippedData ?? []) as Order[]

  const ordersByStatus = ACTIVE_STATUSES.reduce<Record<ActiveStatus, Order[]>>(
    (acc, status) => {
      acc[status] = activeOrders.filter((o) => o.status === status)
      return acc
    },
    { received: [], queued: [], printed: [], packed: [] },
  )

  return (
    <div className="p-4 lg:p-6 max-w-7xl">
      <ProducaoClient ordersByStatus={ordersByStatus} shippedOrders={shippedOrders} />
    </div>
  )
}
