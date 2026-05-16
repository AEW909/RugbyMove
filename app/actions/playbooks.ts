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

const visibilitySchema = z.enum(['private', 'team', 'public'])
const roleSchema = z.enum(['coach', 'player'])

export async function createPlaybook(formData: FormData): Promise<void> {
  let id: string | null = null
  let errorMessage: string | null = null

  try {
    const name = z.string().trim().min(1).max(120).parse(formData.get('name'))
    const description =
      z.string().trim().max(2000).optional().nullable().parse(
        formData.get('description') || null,
      ) ?? null
    const visibility = visibilitySchema.parse(formData.get('visibility') ?? 'private')

    const { supabase, user } = await requireUser()
    const { data, error } = await supabase
      .from('playbooks')
      .insert({ name, description, visibility, owner_id: user.id })
      .select('id')
      .single()

    if (error) {
      errorMessage = error.message
    } else {
      id = data.id
      revalidatePath('/playbooks')
    }
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'Something went wrong.'
  }

  if (errorMessage) {
    redirect(`/playbooks/new?error=${encodeURIComponent(errorMessage)}`)
  }
  redirect(`/playbooks/${id}`)
}

export async function updatePlaybook(formData: FormData): Promise<void> {
  let playbookId: string | null = null
  let errorMessage: string | null = null

  try {
    playbookId = z.string().uuid().parse(formData.get('id'))
    const name = z.string().trim().min(1).max(120).parse(formData.get('name'))
    const description =
      z.string().trim().max(2000).optional().nullable().parse(
        formData.get('description') || null,
      ) ?? null
    const visibility = visibilitySchema.parse(formData.get('visibility') ?? 'private')

    const { supabase } = await requireUser()
    const { error } = await supabase
      .from('playbooks')
      .update({ name, description, visibility })
      .eq('id', playbookId)

    if (error) errorMessage = error.message
    else revalidatePath(`/playbooks/${playbookId}`)
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'Something went wrong.'
  }

  if (errorMessage) {
    redirect(
      `/playbooks/${playbookId}?error=${encodeURIComponent(errorMessage)}`,
    )
  }
  redirect(`/playbooks/${playbookId}?message=Playbook+saved`)
}

export async function deletePlaybook(formData: FormData): Promise<void> {
  const id = z.string().uuid().parse(formData.get('id'))
  const { supabase } = await requireUser()
  const { error } = await supabase.from('playbooks').delete().eq('id', id)
  if (error) redirect(`/playbooks/${id}?error=${encodeURIComponent(error.message)}`)
  revalidatePath('/playbooks')
  redirect('/playbooks')
}

export async function addPlayToPlaybook(formData: FormData): Promise<void> {
  let playbookId: string | null = null
  let errorMessage: string | null = null

  try {
    playbookId = z.string().uuid().parse(formData.get('playbook_id'))
    const playId = z.string().uuid().parse(formData.get('play_id'))

    const { supabase } = await requireUser()
    const { error } = await supabase
      .from('playbook_plays')
      .insert({ playbook_id: playbookId, play_id: playId })

    if (error) errorMessage = error.message
    else revalidatePath(`/playbooks/${playbookId}`)
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'Something went wrong.'
  }

  if (errorMessage) {
    redirect(`/playbooks/${playbookId}?error=${encodeURIComponent(errorMessage)}`)
  }
  redirect(`/playbooks/${playbookId}`)
}

export async function removePlayFromPlaybook(formData: FormData): Promise<void> {
  const playbookId = z.string().uuid().parse(formData.get('playbook_id'))
  const playId = z.string().uuid().parse(formData.get('play_id'))

  const { supabase } = await requireUser()
  const { error } = await supabase
    .from('playbook_plays')
    .delete()
    .eq('playbook_id', playbookId)
    .eq('play_id', playId)

  if (error) redirect(`/playbooks/${playbookId}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(`/playbooks/${playbookId}`)
  redirect(`/playbooks/${playbookId}`)
}

export async function addMember(formData: FormData): Promise<void> {
  let playbookId: string | null = null
  let errorMessage: string | null = null

  try {
    playbookId = z.string().uuid().parse(formData.get('playbook_id'))
    const username = z.string().trim().min(1).max(80).parse(formData.get('username'))
    const role = roleSchema.parse(formData.get('role') ?? 'player')

    const { supabase } = await requireUser()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (profileError || !profile) {
      errorMessage = `No user found with username "${username}".`
    } else {
      const { error } = await supabase
        .from('playbook_members')
        .insert({ playbook_id: playbookId, user_id: profile.id, role })

      if (error) errorMessage = error.message
      else revalidatePath(`/playbooks/${playbookId}`)
    }
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'Something went wrong.'
  }

  if (errorMessage) {
    redirect(`/playbooks/${playbookId}?error=${encodeURIComponent(errorMessage)}`)
  }
  redirect(`/playbooks/${playbookId}`)
}

export async function removeMember(formData: FormData): Promise<void> {
  const playbookId = z.string().uuid().parse(formData.get('playbook_id'))
  const userId = z.string().uuid().parse(formData.get('user_id'))

  const { supabase } = await requireUser()
  const { error } = await supabase
    .from('playbook_members')
    .delete()
    .eq('playbook_id', playbookId)
    .eq('user_id', userId)

  if (error) redirect(`/playbooks/${playbookId}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(`/playbooks/${playbookId}`)
  redirect(`/playbooks/${playbookId}`)
}
