'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  // Use admin client for mutations so RLS auth-JWT timing doesn't block writes.
  // The secret key is server-only; the user is verified above before any write.
  const admin = createAdminClient()
  return { supabase, admin, user: user! }
}

const visibilitySchema = z.enum(['private', 'team', 'public'])
const roleSchema = z.enum(['editor', 'viewer'])

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

    const { admin, user } = await requireUser()
    const { data, error } = await admin
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

    const { admin, user } = await requireUser()
    const { error } = await admin
      .from('playbooks')
      .update({ name, description, visibility })
      .eq('id', playbookId)
      .eq('owner_id', user.id)

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
  const { admin, user } = await requireUser()
  const { error } = await admin.from('playbooks').delete().eq('id', id).eq('owner_id', user.id)
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

    const { admin } = await requireUser()
    const { error } = await admin
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

  const { admin } = await requireUser()
  const { error } = await admin
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
    const role = roleSchema.parse(formData.get('role') ?? 'viewer')

    const { admin, supabase } = await requireUser()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (profileError || !profile) {
      errorMessage = `No user found with username "${username}".`
    } else {
      const { error } = await admin
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

export async function movePlayInPlaybook(formData: FormData): Promise<void> {
  const playbookId = z.string().uuid().parse(formData.get('playbook_id'))
  const playId = z.string().uuid().parse(formData.get('play_id'))
  const direction = z.enum(['up', 'down']).parse(formData.get('direction'))

  const { admin } = await requireUser()

  const { data: plays } = await admin
    .from('playbook_plays')
    .select('play_id, sort_order')
    .eq('playbook_id', playbookId)
    .order('sort_order')
    .order('play_id')

  if (!plays || plays.length < 2) {
    redirect(`/playbooks/${playbookId}`)
  }

  const idx = plays.findIndex((p) => p.play_id === playId)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1

  if (idx < 0 || swapIdx < 0 || swapIdx >= plays.length) {
    redirect(`/playbooks/${playbookId}`)
  }

  // Normalise all sort_orders to 0-based sequential, then swap
  const ordered = plays.map((p, i) => ({ play_id: p.play_id, sort_order: i }))
  const tmp = ordered[idx].sort_order
  ordered[idx].sort_order = ordered[swapIdx].sort_order
  ordered[swapIdx].sort_order = tmp

  await Promise.all([
    admin
      .from('playbook_plays')
      .update({ sort_order: ordered[idx].sort_order })
      .eq('playbook_id', playbookId)
      .eq('play_id', ordered[idx].play_id),
    admin
      .from('playbook_plays')
      .update({ sort_order: ordered[swapIdx].sort_order })
      .eq('playbook_id', playbookId)
      .eq('play_id', ordered[swapIdx].play_id),
  ])

  revalidatePath(`/playbooks/${playbookId}`)
  redirect(`/playbooks/${playbookId}`)
}

