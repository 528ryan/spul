'use client'

import { useState, useTransition } from 'react'
import { completeOnboarding } from '@/app/actions/profiles'

// ── tipos ──────────────────────────────────────────────────────────────────

type BusinessType = '3d_printing' | 'graphic' | 'other'
type Step = 1 | 2 | 3

type CompleteOnboardingAction = (
  businessType: string,
  businessName?: string,
) => Promise<{ error?: string }>

const SUBTITLES: Record<BusinessType, string> = {
  '3d_printing': 'Suas categorias de impressão 3D estão configuradas.',
  graphic: 'Suas categorias de gráfica estão configuradas.',
  other: 'Seu espaço financeiro está pronto.',
}

// ── componente principal ───────────────────────────────────────────────────

export function OnboardingSteps() {
  const [step, setStep] = useState<Step>(1)
  const [businessType, setBusinessType] = useState<BusinessType | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function advance(to: Step) {
    setStep(to)
    setError(null)
  }

  function handleFinish() {
    if (!businessType) return
    setError(null)
    startTransition(async () => {
      const action: CompleteOnboardingAction = completeOnboarding
      const result = await action(businessType, businessName || undefined)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* ── Topbar ────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-8">
        <span className="font-heading text-xl text-text" style={{ letterSpacing: '-0.03em' }}>
          sp<span className="text-accent">u</span>l
        </span>

        {/* Indicador de progresso */}
        <div className="flex items-center gap-2">
          {([1, 2, 3] as Step[]).map((s) => (
            <span
              key={s}
              className={[
                'w-2 h-2 rounded-full transition-colors duration-200',
                step >= s ? 'bg-accent' : 'bg-border',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

      {/* ── Conteúdo centralizado ─────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-[480px] w-full">
          {/* key={step} dispara re-mount e aciona .step-enter */}
          <div key={step} className="step-enter">
            {step === 1 && (
              <Step1
                selected={businessType}
                onSelect={setBusinessType}
                onNext={() => advance(2)}
              />
            )}
            {step === 2 && (
              <Step2
                value={businessName}
                onChange={setBusinessName}
                onBack={() => advance(1)}
                onNext={() => advance(3)}
                onSkip={() => {
                  setBusinessName('')
                  advance(3)
                }}
              />
            )}
            {step === 3 && (
              <Step3
                businessType={businessType!}
                isPending={isPending}
                error={error}
                onFinish={handleFinish}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Step 1 — Tipo de negócio ───────────────────────────────────────────────

interface Step1Props {
  selected: BusinessType | null
  onSelect: (t: BusinessType) => void
  onNext: () => void
}

const BUSINESS_CARDS: {
  value: BusinessType
  title: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    value: '3d_printing',
    title: 'Impressão 3D',
    description: 'FDM, resina, SLA — venda de peças e produtos impressos',
    icon: <IconCube />,
  },
  {
    value: 'graphic',
    title: 'Gráfica & Plotter',
    description: 'Adesivos, papel de parede, corte e impressão gráfica',
    icon: <IconRoll />,
  },
  {
    value: 'other',
    title: 'Outro negócio',
    description: 'Qualquer outro tipo de negócio criativo ou artesanal',
    icon: <IconBriefcase />,
  },
]

function Step1({ selected, onSelect, onNext }: Step1Props) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text mb-2">
          Qual é o seu negócio?
        </h1>
        <p className="text-sm text-muted">
          Isso nos ajuda a personalizar suas categorias e relatórios.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {BUSINESS_CARDS.map((card) => {
          const isSelected = selected === card.value
          return (
            <button
              key={card.value}
              type="button"
              onClick={() => onSelect(card.value)}
              style={
                isSelected
                  ? { boxShadow: '0 0 0 2px #a78bfa, 0 4px 16px rgba(167,139,250,0.15)' }
                  : undefined
              }
              className={[
                'text-left rounded-2xl p-5 transition-all duration-200 cursor-pointer',
                isSelected
                  ? 'bg-accent-muted border-2 border-accent'
                  : 'bg-surface border border-border hover:bg-surface-2 hover:border-border-2 hover:[box-shadow:0_4px_12px_rgba(167,139,250,0.08)]',
              ].join(' ')}
            >
              <span className={isSelected ? 'text-accent' : 'text-muted'}>
                {card.icon}
              </span>
              <p className="text-sm font-semibold text-text mt-3">{card.title}</p>
              <p className="text-xs text-muted mt-1">{card.description}</p>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={selected === null}
        className="w-full bg-accent text-bg rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-accent-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continuar →
      </button>
    </div>
  )
}

// ── Step 2 — Nome do negócio ───────────────────────────────────────────────

interface Step2Props {
  value: string
  onChange: (v: string) => void
  onBack: () => void
  onNext: () => void
  onSkip: () => void
}

function Step2({ value, onChange, onBack, onNext, onSkip }: Step2Props) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text mb-2">
          Como se chama seu negócio?
        </h1>
        <p className="text-sm text-muted">
          Opcional — você pode preencher depois nas configurações.
        </p>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex: Studio 3D do João"
        maxLength={100}
        className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 text-muted hover:text-text rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
        >
          ← Voltar
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 bg-accent text-bg rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-accent-dim transition-colors"
        >
          Continuar →
        </button>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted hover:text-text-2 transition-colors"
        >
          Pular por agora
        </button>
      </div>
    </div>
  )
}

// ── Step 3 — Pronto ────────────────────────────────────────────────────────

interface Step3Props {
  businessType: BusinessType
  isPending: boolean
  error: string | null
  onFinish: () => void
}

function Step3({ businessType, isPending, error, onFinish }: Step3Props) {
  const subtitle = businessType ? SUBTITLES[businessType] : ''

  return (
    <div className="space-y-8 text-center">
      {/* Check icon */}
      <div className="flex justify-center">
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="32" cy="32" r="30" stroke="#a78bfa" strokeWidth="2.5" />
          <path
            d="M20 32l9 9 15-15"
            stroke="#a78bfa"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-text mb-2">Tudo pronto!</h1>
        <p className="text-sm text-accent mb-4">{subtitle}</p>
        <p className="text-sm text-muted">
          Comece registrando seu primeiro lançamento ou explorando o dashboard.
        </p>
      </div>

      {error && (
        <p className="text-danger text-sm bg-danger-dim rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onFinish}
        disabled={isPending}
        className="w-full bg-accent text-bg rounded-lg px-4 py-3 text-sm font-semibold hover:bg-accent-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isPending && (
          <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
        )}
        {isPending ? 'Salvando...' : 'Ir para o dashboard →'}
      </button>
    </div>
  )
}

// ── Ícones inline SVG ──────────────────────────────────────────────────────

function IconCube() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="3.27 6.96 12 12.01 20.73 6.96"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="12"
        y1="22.08"
        x2="12"
        y2="12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconRoll() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="3"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="3"
        y1="21"
        x2="21"
        y2="21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="7"
        y1="7"
        x2="17"
        y2="7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="7"
        y1="11"
        x2="14"
        y2="11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconBriefcase() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="2"
        y="7"
        width="20"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="12"
        y1="12"
        x2="12"
        y2="12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M2 12h20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
