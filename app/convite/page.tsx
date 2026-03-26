import { createClient } from '@/lib/supabase/server'
import { ConviteClient } from './ConviteClient'

export default async function ConvitePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { code } = await searchParams

  return (
    <ConviteClient
      isLoggedIn={!!user}
      initialCode={code ?? ''}
    />
  )
}
