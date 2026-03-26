'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Invite, WorkspaceMember } from '@/lib/types'

// ── helpers ───────────────────────────────────────────────────────────────

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = 'SPUL'
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

// ── generateInviteCode ────────────────────────────────────────────────────

export async function generateInviteCode(): Promise<{
  code?: string
  expiresAt?: string
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  if (!profile?.workspace_id) return { error: 'Workspace não encontrado' }
  const wsId = profile.workspace_id as string

  await supabase.from('invites').update({ is_active: false }).eq('workspace_id', wsId)

  const code = randomCode()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('invites').insert({
    workspace_id: wsId,
    code,
    created_by: user.id,
    expires_at: expiresAt,
    is_active: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/configuracoes')
  return { code, expiresAt }
}

// ── getActiveInvite ───────────────────────────────────────────────────────

export async function getActiveInvite(): Promise<Invite | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  if (!profile?.workspace_id) return null

  const { data } = await supabase
    .from('invites')
    .select('*')
    .eq('workspace_id', profile.workspace_id as string)
    .eq('is_active', true)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as Invite | null) ?? null
}

// ── revokeInvite ──────────────────────────────────────────────────────────

export async function revokeInvite(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  if (!profile?.workspace_id) return { success: false, error: 'Workspace não encontrado' }

  const { error } = await supabase
    .from('invites')
    .update({ is_active: false })
    .eq('workspace_id', profile.workspace_id as string)

  if (error) return { success: false, error: error.message }

  revalidatePath('/configuracoes')
  return { success: true }
}

// ── acceptInvite ──────────────────────────────────────────────────────────

export async function acceptInvite(
  code: string,
): Promise<{ success: boolean; workspaceId?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const { data: invite } = await supabase
    .from('invites')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!invite) return { success: false, error: 'Convite inválido ou expirado' }

  const { data: existing } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', invite.workspace_id as string)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) return { success: false, error: 'Você já é membro deste workspace' }

  const { error: memberError } = await supabase.from('workspace_members').insert({
    workspace_id: invite.workspace_id,
    user_id: user.id,
    role: 'viewer',
    invited_by: invite.created_by,
  })

  if (memberError) return { success: false, error: memberError.message }

  const now = new Date().toISOString()

  await supabase
    .from('invites')
    .update({ used_at: now, used_by: user.id })
    .eq('id', invite.id as string)

  await supabase
    .from('profiles')
    .update({ workspace_id: invite.workspace_id, onboarding_done: true })
    .eq('id', user.id)

  revalidatePath('/', 'layout')
  return { success: true, workspaceId: invite.workspace_id as string }
}

// ── getWorkspaceMembers ───────────────────────────────────────────────────

export async function getWorkspaceMembers(): Promise<WorkspaceMember[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  if (!profile?.workspace_id) return []

  // Uses RPC function get_workspace_members_with_email from migration 004
  const { data, error } = await supabase.rpc('get_workspace_members_with_email', {
    p_workspace_id: profile.workspace_id as string,
  })

  if (error) return []
  return (data ?? []) as WorkspaceMember[]
}

// ── revokeMemberAccess ────────────────────────────────────────────────────

export async function revokeMemberAccess(
  memberId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  if (!profile?.workspace_id) return { success: false, error: 'Workspace não encontrado' }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', profile.workspace_id as string)
    .single()

  if (workspace?.owner_id !== user.id) return { success: false, error: 'Sem permissão' }

  const { data: member } = await supabase
    .from('workspace_members')
    .select('user_id, role')
    .eq('id', memberId)
    .eq('workspace_id', profile.workspace_id as string)
    .single()

  if (!member) return { success: false, error: 'Membro não encontrado' }
  if (member.role === 'owner') return { success: false, error: 'Não é possível revogar o proprietário' }

  const { error } = await supabase
    .from('workspace_members')
    .update({ is_active: false })
    .eq('id', memberId)

  if (error) return { success: false, error: error.message }

  await supabase
    .from('profiles')
    .update({ workspace_id: null })
    .eq('id', member.user_id as string)

  revalidatePath('/configuracoes')
  return { success: true }
}
