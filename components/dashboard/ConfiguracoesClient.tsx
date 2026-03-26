'use client'

import { useState, useTransition } from 'react'
import { updateBusinessInfo } from '@/app/actions/profiles'
import {
  generateInviteCode,
  revokeInvite,
  revokeMemberAccess,
} from '@/app/actions/invites'
import { useToast } from '@/components/ui/ToastProvider'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { PLAN_LIMITS } from '@/lib/constants/plans'
import type { WorkspaceProfile, WorkspaceMember, Invite } from '@/lib/types'

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

interface Props {
  profile: WorkspaceProfile
  isOwner: boolean
  invite: Invite | null
  members: WorkspaceMember[]
  txCount: number
  productCount: number
  activeOrderCount: number
}

export function ConfiguracoesClient({
  profile,
  isOwner,
  invite: initialInvite,
  members: initialMembers,
  txCount,
  productCount,
  activeOrderCount,
}: Props) {
  const { showToast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [invite, setInvite] = useState<Invite | null>(initialInvite)
  const [members, setMembers] = useState<WorkspaceMember[]>(initialMembers)
  const [businessName, setBusinessName] = useState(profile.business_name ?? '')
  const [businessType, setBusinessType] = useState<string>(profile.business_type)
  const [copied, setCopied] = useState(false)

  const plan = profile.plan
  const limits = PLAN_LIMITS[plan]

  const inputCls =
    'w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors'
  const selectCls =
    'w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors cursor-pointer'

  function handleSaveBusiness() {
    startTransition(async () => {
      const result = await updateBusinessInfo(businessName, businessType)
      if (result.error) showToast(result.error, 'error')
      else showToast('Dados atualizados', 'success')
    })
  }

  function handleGenerateInvite() {
    startTransition(async () => {
      const result = await generateInviteCode()
      if (result.error) {
        showToast(result.error, 'error')
      } else if (result.code && result.expiresAt) {
        setInvite({
          id: '',
          workspace_id: '',
          code: result.code,
          created_by: '',
          expires_at: result.expiresAt,
          used_at: null,
          used_by: null,
          is_active: true,
          created_at: new Date().toISOString(),
        })
        showToast('Código gerado', 'success')
      }
    })
  }

  function handleRevokeInvite() {
    if (!window.confirm('Revogar o convite atual?')) return
    startTransition(async () => {
      const result = await revokeInvite()
      if (result.error) showToast(result.error, 'error')
      else {
        setInvite(null)
        showToast('Convite revogado', 'success')
      }
    })
  }

  function handleCopyCode() {
    if (!invite) return
    void navigator.clipboard.writeText(invite.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleRevokeMember(memberId: string, email: string) {
    if (!window.confirm(`Revogar acesso de ${email}? Esta ação não pode ser desfeita.`)) return
    startTransition(async () => {
      const result = await revokeMemberAccess(memberId)
      if (result.error) showToast(result.error, 'error')
      else {
        setMembers((prev) => prev.filter((m) => m.id !== memberId))
        showToast('Acesso revogado', 'success')
      }
    })
  }

  const siteUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? 'https://spul.app'

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-text">Configurações</h1>
        <p className="text-sm text-muted mt-1">Gerencie seu negócio e equipe</p>
      </div>

      {/* ── Meu negócio ─────────────────────────────────────── */}
      <section className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text">Meu negócio</h2>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-2 uppercase tracking-wide">
            Nome do negócio
          </label>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Ex: Impressão3D do João"
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-2 uppercase tracking-wide">
            Tipo de negócio
          </label>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className={selectCls}
          >
            <option value="3d_printing">Impressão 3D</option>
            <option value="graphic">Design Gráfico</option>
            <option value="other">Outro</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleSaveBusiness}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-bg rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
        >
          {isPending && <Spinner size="sm" />}
          Salvar alterações
        </button>
      </section>

      {/* ── Equipe (owner only) ─────────────────────────────── */}
      {isOwner && (
        <section className="bg-surface border border-border rounded-xl p-5 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-text">Acesso da equipe</h2>
            <p className="text-xs text-muted mt-1">
              Compartilhe o código com seu sócio. Ele deve acessar{' '}
              <span className="text-accent font-mono">{siteUrl}/convite</span> e inserir o
              código.
            </p>
          </div>

          {/* Invite card */}
          {invite ? (
            <div className="bg-surface-2 border border-border rounded-lg p-4 space-y-3">
              <p className="text-xs font-medium text-muted uppercase tracking-wide">
                Código de convite
              </p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl font-bold text-accent tracking-widest">
                  {invite.code}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="text-xs px-3 py-1.5 bg-accent-muted text-accent rounded-lg border border-accent/20 hover:bg-accent/20 transition-colors cursor-pointer"
                >
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <p className="text-xs text-muted">
                Expira em: {formatDate(invite.expires_at)}
              </p>
              <button
                type="button"
                onClick={handleRevokeInvite}
                disabled={isPending}
                className="text-xs text-danger hover:text-danger/80 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Revogar convite
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerateInvite}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 bg-surface-2 border border-border text-text text-sm rounded-lg hover:border-accent hover:text-accent transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? <Spinner size="sm" /> : <IconPlus />}
              Gerar código de convite
            </button>
          )}

          {/* Members list */}
          {members.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted uppercase tracking-wide">
                Membros com acesso
              </p>
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 bg-surface-2 border border-border rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent-muted text-accent text-sm font-semibold flex items-center justify-center shrink-0">
                      {(member.email[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text truncate">{member.email}</p>
                      {member.business_name && (
                        <p className="text-xs text-muted truncate">{member.business_name}</p>
                      )}
                      <p className="text-[10px] text-muted-2">
                        Desde {new Intl.DateTimeFormat('pt-BR').format(new Date(member.joined_at))}
                      </p>
                    </div>
                    <Badge variant={member.role === 'owner' ? 'accent' : 'muted'}>
                      {member.role === 'owner' ? 'Proprietário' : 'Visualizador'}
                    </Badge>
                    {member.role === 'viewer' && (
                      <button
                        type="button"
                        onClick={() => handleRevokeMember(member.id, member.email)}
                        disabled={isPending}
                        className="text-xs text-muted hover:text-danger transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                        title="Revogar acesso"
                      >
                        <IconX />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Plano ───────────────────────────────────────────── */}
      <section className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Plano</h2>
          <Badge variant={plan === 'pro' ? 'accent' : 'muted'}>
            {plan === 'pro' ? 'Pro' : 'Free'}
          </Badge>
        </div>

        {plan === 'free' && (
          <div className="space-y-2">
            <UsageRow
              label="Lançamentos este mês"
              current={txCount}
              max={limits.transactions_per_month as number}
            />
            <UsageRow
              label="Produtos"
              current={productCount}
              max={limits.products as number}
            />
            <UsageRow
              label="Pedidos ativos"
              current={activeOrderCount}
              max={limits.active_orders as number}
            />
          </div>
        )}

        <button
          type="button"
          disabled
          className="px-4 py-2 bg-surface-2 border border-border text-muted text-sm rounded-lg cursor-not-allowed opacity-60"
          title="Em breve"
        >
          Ver planos — Em breve
        </button>
      </section>
    </div>
  )
}

function UsageRow({
  label,
  current,
  max,
}: {
  label: string
  current: number
  max: number
}) {
  const pct = Math.min(100, (current / max) * 100)
  const isWarning = pct >= 80
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className={isWarning ? 'text-danger' : 'text-text'}>
          {current} / {max}
        </span>
      </div>
      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isWarning ? 'bg-danger' : 'bg-accent'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
