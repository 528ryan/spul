import { AuthPreview } from '@/components/auth/AuthPreview'
import { SignupForm } from '@/components/auth/SignupForm'

export default function SignupPage() {
  return (
    <main className="min-h-screen grid md:grid-cols-2">
      {/* ── Lado esquerdo — formulário ───────────────────── */}
      <div className="flex flex-col bg-bg p-8 md:p-12">
        {/* Logo */}
        <div>
          <span className="text-xl font-semibold tracking-tight text-text">
            sp<span className="text-accent">u</span>l
          </span>
        </div>

        {/* Conteúdo centralizado */}
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full py-12">
          {/* Textos */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-text leading-tight mb-2">
              Comece agora,
              <br />
              de graça.
            </h1>
            <p className="text-sm text-muted">
              Crie sua conta e tenha controle total do seu negócio.
            </p>
          </div>

          <SignupForm />
        </div>
      </div>

      {/* ── Lado direito — preview (hidden mobile) ───────── */}
      <AuthPreview />
    </main>
  )
}
