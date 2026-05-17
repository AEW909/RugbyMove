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
