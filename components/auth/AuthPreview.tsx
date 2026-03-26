// Painel direito do split layout — dados fictícios de preview

const movements = [
  { label: 'Venda Shopee',      amount: '+R$ 850,00',  positive: true  },
  { label: 'Filamento PLA',     amount: '-R$ 189,90',  positive: false },
  { label: 'Serviço gravura',   amount: '+R$ 320,00',  positive: true  },
]

export function AuthPreview() {
  return (
    <div className="hidden md:flex flex-col justify-between h-full bg-surface border-l border-border p-10">
      {/* Cards de preview */}
      <div className="flex-1 flex flex-col justify-center gap-5 max-w-xs mx-auto w-full">

        {/* Card saldo */}
        <div className="bg-surface-2 border border-border rounded-2xl p-5">
          <p className="text-xs text-muted uppercase tracking-wide mb-3">Saldo do mês</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-semibold text-text tabular-nums">
              R$ 4.230,00
            </span>
            <span className="text-success text-sm font-medium">+12.4%</span>
          </div>
        </div>

        {/* Mini lista movimentações */}
        <div className="bg-surface-2 border border-border rounded-2xl p-5">
          <p className="text-xs text-muted uppercase tracking-wide mb-4">Últimos lançamentos</p>
          <ul className="space-y-3">
            {movements.map((m) => (
              <li key={m.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      'w-1.5 h-1.5 rounded-full',
                      m.positive ? 'bg-success' : 'bg-danger',
                    ].join(' ')}
                  />
                  <span className="text-sm text-text-2">{m.label}</span>
                </div>
                <span
                  className={[
                    'text-sm font-medium tabular-nums',
                    m.positive ? 'text-success' : 'text-danger',
                  ].join(' ')}
                >
                  {m.amount}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Card margem com donut CSS */}
        <div className="bg-surface-2 border border-border rounded-2xl p-5">
          <p className="text-xs text-muted uppercase tracking-wide mb-4">Margem bruta</p>
          <div className="flex items-center gap-5">
            {/* Donut CSS — 62% = 223deg */}
            <div className="relative w-16 h-16 shrink-0">
              <div
                className="w-16 h-16 rounded-full"
                style={{
                  background:
                    'conic-gradient(#a78bfa 0deg 223deg, #1e1e28 223deg 360deg)',
                }}
              />
              <div className="absolute inset-[5px] rounded-full bg-surface-2 flex items-center justify-center">
                <span className="text-xs font-semibold text-text">62%</span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-semibold text-text">62%</p>
              <p className="text-xs text-muted mt-0.5">Este mês</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tagline */}
      <p className="text-sm text-muted text-center mt-8">
        Clareza financeira para makers.
      </p>
    </div>
  )
}
