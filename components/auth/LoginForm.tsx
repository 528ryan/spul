'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { signInWithEmail, signInWithGoogle } from '@/app/actions/auth'

export function LoginForm() {
  const [emailPending, startEmailTransition] = useTransition()
  const [googlePending, startGoogleTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const busy = emailPending || googlePending

  function handleEmailSubmit(formData: FormData) {
    setError(null)
    startEmailTransition(async () => {
      const result = await signInWithEmail(formData)
      if (result?.error) setError(result.error)
    })
  }

  function handleGoogle() {
    setError(null)
    startGoogleTransition(async () => {
      const result = await signInWithGoogle()
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-6">
      {/* Botão Google */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        className="w-full flex items-center justify-center gap-3 bg-surface-2 border border-border text-text rounded-lg px-4 py-2.5 text-sm font-medium hover:border-border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {googlePending ? (
          <span className="w-4 h-4 border-2 border-muted border-t-accent rounded-full animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        {googlePending ? 'Redirecionando...' : 'Continuar com Google'}
      </button>

      {/* Divisor */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted">ou</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Form email/senha */}
      <form action={handleEmailSubmit} className="space-y-4">
        {error && (
          <p className="text-danger text-sm bg-danger-dim rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-text-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="seu@email.com"
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-text-2">
            Senha
          </label>
          <input
            id="password"
            type="password"
            name="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-accent text-bg rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-accent-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {emailPending && (
            <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
          )}
          {emailPending ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      {/* Link signup */}
      <p className="text-center text-sm text-muted">
        Não tem conta?{' '}
        <Link href="/signup" className="text-accent hover:text-text-2 transition-colors">
          Cadastre-se
        </Link>
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
