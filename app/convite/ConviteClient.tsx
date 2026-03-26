'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptInvite } from '@/app/actions/invites'
import { Spinner } from '@/components/ui/Spinner'
import Link from 'next/link'

interface Props {
  isLoggedIn: boolean
  initialCode: string
}

export function ConviteClient({ isLoggedIn, initialCode }: Props) {
  const router = useRouter()
  const [code, setCode] = useState(initialCode)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleAccept() {
    if (!code.trim()) { setError('Insira o código'); return }
    setError('')
    startTransition(async () => {
      const result = await acceptInvite(code.trim())
      if (result.success) {
        router.push('/dashboard')
      } else {
        setError(result.error ?? 'Erro ao aceitar convite')
      }
    })
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <span className="font-heading text-2xl text-text" style={{ letterSpacing: '-0.03em' }}>
            sp<span className="text-accent">u</span>l
          </span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
          <div>
            <p className="text-xs font-medium text-accent uppercase tracking-widest mb-2">
              Convite
            </p>
            <h1 className="text-xl font-semibold text-text">Você foi convidado</h1>
            <p className="text-sm text-muted mt-1">
              Insira o código de convite para acessar o workspace.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-2 uppercase tracking-wide">
              Código
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SPULXXXX"
              maxLength={8}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors tracking-widest uppercase"
              onKeyDown={(e) => { if (e.key === 'Enter' && isLoggedIn) handleAccept() }}
            />
            {error && <p className="text-xs text-danger mt-1">{error}</p>}
          </div>

          {isLoggedIn ? (
            <button
              type="button"
              onClick={handleAccept}
              disabled={isPending || !code.trim()}
              className="w-full flex items-center justify-center gap-2 bg-accent text-bg rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPending && <Spinner size="sm" />}
              {isPending ? 'Aceitando...' : 'Aceitar convite →'}
            </button>
          ) : (
            <div className="space-y-2">
              <Link
                href={`/signup?invite=${encodeURIComponent(code)}`}
                className="w-full flex items-center justify-center bg-accent text-bg rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Criar conta →
              </Link>
              <Link
                href={`/login?invite=${encodeURIComponent(code)}`}
                className="w-full flex items-center justify-center bg-surface-2 border border-border text-text rounded-lg py-2.5 text-sm font-medium hover:border-accent hover:text-accent transition-colors"
              >
                Já tenho conta
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted">
          Não tem código?{' '}
          <Link href="/landing" className="text-accent hover:underline">
            Saiba mais sobre o Spul
          </Link>
        </p>
      </div>
    </main>
  )
}
