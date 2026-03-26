import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveInvite, getWorkspaceMembers } from '@/app/actions/invites'
import { ConfiguracoesClient } from '@/components/dashboard/ConfiguracoesClient'
import type { WorkspaceProfile, Workspace, WorkspaceMember, Invite } from '@/lib/types'

function monthRange(): { start: string; end: string } {
  const now = new Date()
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10),
  }
}

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const typedProfile = profile as unknown as WorkspaceProfile

  let workspace: Workspace | null = null
  let isOwner = false

  if (typedProfile.workspace_id) {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', typedProfile.workspace_id)
      .single()
    workspace = (ws as unknown as Workspace) ?? null
    isOwner = workspace?.owner_id === user.id
  }

  let invite: Invite | null = null
  let members: WorkspaceMember[] = []

  if (isOwner) {
    invite = await getActiveInvite()
    members = await getWorkspaceMembers()
  }

  const { start, end } = monthRange()
  const [{ count: txCount }, { count: productCount }, { count: activeOrderCount }] =
    await Promise.all([
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('date', start)
        .lt('date', end),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['received', 'queued', 'printed', 'packed']),
    ])

  return (
    <ConfiguracoesClient
      profile={typedProfile}
      isOwner={isOwner}
      invite={invite}
      members={members}
      txCount={txCount ?? 0}
      productCount={productCount ?? 0}
      activeOrderCount={activeOrderCount ?? 0}
    />
  )
}
