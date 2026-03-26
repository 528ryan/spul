import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { acceptInvite } from '@/app/actions/invites'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_user`)
  }

  // Garante que o profile existe (fallback se o trigger falhou)
  await supabase.from('profiles').upsert(
    {
      id: user.id,
      business_type: '3d_printing',
      plan: 'free',
      onboarding_done: false,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  )

  // Handle invite if present
  const inviteCode = searchParams.get('invite')
  if (inviteCode) {
    await acceptInvite(inviteCode)
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_done')
    .eq('id', user.id)
    .single()

  if (profile?.onboarding_done) {
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  return NextResponse.redirect(`${origin}/onboarding`)
}
