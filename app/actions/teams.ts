'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  return { supabase, user: user! }
}

export async function createTeam(formData: FormData): Promise<void> {
  const name = z.string().trim().min(1).max(120).parse(formData.get('name'))
  const { supabase, user } = await requireUser()

  const { error } = await supabase.from('teams').insert({ name, owner_id: user.id })

  if (error) redirect(`/account?error=${encodeURIComponent(error.message)}`)
  revalidatePath('/account')
  redirect('/account?message=Team+created')
}

export async function setDefaultTeam(formData: FormData): Promise<void> {
  const raw = formData.get('team_id')
  const teamId = raw ? z.string().uuid().parse(raw) : null
  const { supabase, user } = await requireUser()

  const { error } = await supabase
    .from('profiles')
    .update({ default_team_id: teamId })
    .eq('id', user.id)

  if (error) redirect(`/account?error=${encodeURIComponent(error.message)}`)
  revalidatePath('/account')
  redirect('/account?message=Default+team+updated')
}

export async function setDefaultPlaybook(formData: FormData): Promise<void> {
  const raw = formData.get('playbook_id')
  const playbookId = raw ? z.string().uuid().parse(raw) : null
  const { supabase, user } = await requireUser()

  const { error } = await supabase
    .from('profiles')
    .update({ default_playbook_id: playbookId })
    .eq('id', user.id)

  if (error) redirect(`/account?error=${encodeURIComponent(error.message)}`)
  revalidatePath('/account')
  redirect('/account?message=Default+playbook+updated')
}

type SetupDefaultsInput = {
  teamId?: string
  teamName?: string
  playbookId?: string
  playbookName?: string
}

type SetupDefaultsResult = {
  success: boolean
  error?: string
  teamId?: string
  playbookId?: string
}

export async function setupDefaults(
  input: SetupDefaultsInput,
): Promise<SetupDefaultsResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  let finalTeamId = input.teamId ?? null
  let finalPlaybookId = input.playbookId ?? null

  if (!finalTeamId && input.teamName?.trim()) {
    const { data, error } = await supabase
      .from('teams')
      .insert({ name: input.teamName.trim(), owner_id: user.id })
      .select('id')
      .single()
    if (error) return { success: false, error: error.message }
    finalTeamId = data.id
    revalidatePath('/account')
  }

  if (!finalPlaybookId && input.playbookName?.trim()) {
    const { data, error } = await supabase
      .from('playbooks')
      .insert({ name: input.playbookName.trim(), owner_id: user.id, visibility: 'private' })
      .select('id')
      .single()
    if (error) return { success: false, error: error.message }
    finalPlaybookId = data.id
    revalidatePath('/account')
  }

  if (!finalTeamId || !finalPlaybookId) {
    return { success: false, error: 'A team and a playbook are both required.' }
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      default_team_id: finalTeamId,
      default_playbook_id: finalPlaybookId,
    })
    .eq('id', user.id)

  if (profileError) return { success: false, error: profileError.message }

  revalidatePath('/')
  return { success: true, teamId: finalTeamId, playbookId: finalPlaybookId }
}
