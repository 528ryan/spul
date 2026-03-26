import { AuthPreview } from '@/components/auth/AuthPreview'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <main className="min-h-screen grid md:grid-cols-2">
      {/* ── Lado esquerdo — formulário ───────────────────── */}
      <div className="flex flex-col bg-bg p-8 md:p-12">
        {/* Logo */}
        <div>
          <span className="font-heading text-xl text-text" style={{ letterSpacing: '-0.03em' }}>
            sp<span className="text-accent">u</span>l
          </span>
        </div>

        {/* Conteúdo centralizado */}
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full py-12">
          {/* Textos */}
          <div className="mb-8">
            <p className="text-xs font-medium text-accent uppercase tracking-widest mb-3">
              Bem-vindo de volta
            </p>
            <h1 className="text-3xl font-semibold text-text leading-tight mb-2">
              Seu caixa,
              <br />
              clareza total.
            </h1>
            <p className="text-sm text-muted">
              Entre para ver como seu negócio está indo.
            </p>
          </div>

          <LoginForm />
        </div>
      </div>

      {/* ── Lado direito — preview (hidden mobile) ───────── */}
      <AuthPreview />
    </main>
  )
}
