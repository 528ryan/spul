import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_ROUTES = ['/', '/landing', '/login', '/signup', '/auth/callback', '/convite']

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith('/auth/') || pathname.startsWith('/convite'),
  )
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Rotas públicas — deixa passar sem verificações adicionais
  if (isPublic(pathname)) {
    // Autenticado tentando acessar /login → redireciona para /dashboard
    if (user && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // A partir daqui: rota protegida
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Busca onboarding_done do profile
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
        },
      },
    },
  )

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_done')
    .eq('id', user.id)
    .single()

  const onboardingDone = profile?.onboarding_done === true

  // /onboarding: requer auth, redireciona para /dashboard se já fez onboarding
  if (pathname.startsWith('/onboarding')) {
    if (onboardingDone) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // /dashboard e subrotas: requer auth + onboarding_done
  if (pathname.startsWith('/dashboard')) {
    if (!onboardingDone) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
