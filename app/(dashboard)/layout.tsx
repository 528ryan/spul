import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Shell } from '@/components/layout/Shell'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { ensureWorkspace } from '@/app/actions/profiles'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  await ensureWorkspace()

  return (
    <ToastProvider>
      <Shell userEmail={user.email ?? ''}>{children}</Shell>
    </ToastProvider>
  )
}
