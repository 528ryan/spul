'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const BusinessTypeSchema = z.enum(['3d_printing', 'graphic', 'other'])

export async function completeOnboarding(
  businessType: string,
  businessName?: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Não autenticado' }

  const parsedType = BusinessTypeSchema.safeParse(businessType)
  if (!parsedType.success) {
    return { error: 'Tipo de negócio inválido' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      business_type: parsedType.data,
      business_name: businessName ?? null,
      onboarding_done: true,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function ensureWorkspace(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('workspace_id, business_name, onboarding_done')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_done || profile.workspace_id) return

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .insert({ owner_id: user.id, name: profile.business_name })
    .select('id')
    .single()

  if (error || !workspace) return

  await supabase
    .from('profiles')
    .update({ workspace_id: workspace.id })
    .eq('id', user.id)

  await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: 'owner',
    invited_by: user.id,
  })
}

export async function updateBusinessInfo(
  businessName: string,
  businessType: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsedType = BusinessTypeSchema.safeParse(businessType)
  if (!parsedType.success) return { error: 'Tipo de negócio inválido' }

  const { error } = await supabase
    .from('profiles')
    .update({ business_name: businessName, business_type: parsedType.data })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/configuracoes')
  return {}
}
