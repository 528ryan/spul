import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TransactionForm } from '@/components/dashboard/TransactionForm'
import { TransactionList } from '@/components/dashboard/TransactionList'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import type { Transaction, Category, Profile } from '@/lib/types'

// ── helpers ───────────────────────────────────────────────────────────────

function getMonthRange(monthParam: string | undefined): {
  startDate: string
  endDate: string
  currentMonth: string
} {
  const now = new Date()
  const currentMonth =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const month = monthParam ?? currentMonth
  const [yearStr, monStr] = month.split('-')
  const year = Number(yearStr)
  const mon  = Number(monStr)
  const start = new Date(year, mon - 1, 1)
  const end   = new Date(year, mon, 1)
  return {
    startDate:    start.toISOString().slice(0, 10),
    endDate:      end.toISOString().slice(0, 10),
    currentMonth: month,
  }
}

// ── page ──────────────────────────────────────────────────────────────────

export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const { startDate, endDate, currentMonth } = getMonthRange(month)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Queries paralelas
  const [profileResult, transactionsResult, categoriesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, business_type, business_name, plan, onboarding_done, created_at')
      .eq('id', user.id)
      .single(),

    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lt('date', endDate)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),

    supabase
      .from('categories')
      .select('id, user_id, business_type, name, type, is_default, sort_order')
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order('sort_order', { ascending: true, nullsFirst: false }),
  ])

  const profile      = profileResult.data as Profile | null
  const transactions = (transactionsResult.data ?? []) as Transaction[]
  const allCategories = (categoriesResult.data ?? []) as Category[]

  // Filtra categorias pelo business_type do usuário
  const businessType = profile?.business_type ?? 'other'
  const categories = allCategories.filter(
    (c) => c.business_type === null || c.business_type === businessType,
  )

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-text">Lançamentos</h1>
        <MonthSelector currentMonth={currentMonth} />
      </div>

      {/* Form */}
      <TransactionForm categories={categories} />

      {/* List */}
      <TransactionList transactions={transactions} categories={categories} />
    </div>
  )
}
