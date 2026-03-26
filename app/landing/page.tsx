export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center overflow-hidden">
      {/* Glow ambiental */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      {/* SVG decorativo com rotação lenta */}
      <div aria-hidden="true" className="absolute opacity-10 animate-rotate-slow">
        <svg width="520" height="520" viewBox="0 0 520 520" fill="none">
          <circle cx="260" cy="260" r="200" stroke="#a78bfa" strokeWidth="1" strokeDasharray="6 8" />
          <circle cx="260" cy="260" r="240" stroke="#a78bfa" strokeWidth="0.5" strokeDasharray="3 12" />
        </svg>
      </div>

      {/* Conteúdo hero */}
      <div className="relative text-center px-4 animate-fade-in">
        {/* Logo */}
        <h1
          className="text-7xl md:text-8xl text-text mb-6"
          style={{ letterSpacing: '-0.04em', lineHeight: 1.0 }}
        >
          sp<span className="text-accent">u</span>l
        </h1>

        <p className="text-muted text-base md:text-lg max-w-xs mx-auto leading-relaxed mb-10">
          Dashboard financeiro para e-commerce de produtos maker
        </p>

        {/* CTAs */}
        <div className="flex gap-3 justify-center">
          <a
            href="/login"
            className="animate-pulse-ring px-6 py-3 bg-accent text-bg rounded-lg text-sm font-semibold cursor-pointer hover:opacity-90 hover:-translate-y-px active:translate-y-0 active:scale-[0.97] transition-all duration-200"
          >
            Entrar
          </a>
          <a
            href="/signup"
            className="px-6 py-3 border border-border text-text-2 rounded-lg text-sm font-medium cursor-pointer hover:border-border-2 hover:text-text transition-all duration-200"
          >
            Criar conta
          </a>
        </div>
      </div>
    </main>
  )
}
