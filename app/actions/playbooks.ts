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
  let orgId: string | null = null

  try {
    const name = z.string().trim().min(1).max(120).parse(formData.get('name'))
    const description =
      z.string().trim().max(2000).optional().nullable().parse(
        formData.get('description') || null,
      ) ?? null
    const visibility = visibilitySchema.parse(formData.get('visibility') ?? 'private')
    const rawOrgId = formData.get('org_id')
    orgId = rawOrgId ? z.string().uuid().parse(rawOrgId) : null

    const { admin, user } = await requireUser()
    const { data, error } = await admin
      .from('playbooks')
      .insert({ name, description, visibility, owner_id: user.id, ...(orgId ? { org_id: orgId } : {}) })
      .select('id')
      .single()

    if (error) {
      errorMessage = error.message
    } else {
      id = data.id
      revalidatePath('/playbooks')
      if (orgId) revalidatePath(`/org/${orgId}`)
    }
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'Something went wrong.'
  }

  if (errorMessage) {
    const base = orgId ? `/playbooks/new?org_id=${orgId}` : '/playbooks/new'
    redirect(`${base}${orgId ? '&' : '?'}error=${encodeURIComponent(errorMessage)}`)
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

export async function syncPlaybookPlay(
  playbookId: string,
  playId: string,
  add: boolean,
): Promise<void> {
  const pid = z.string().uuid().parse(playbookId)
  const ppid = z.string().uuid().parse(playId)
  const { admin } = await requireUser()

  if (add) {
    await admin
      .from('playbook_plays')
      .upsert({ playbook_id: pid, play_id: ppid }, { onConflict: 'playbook_id,play_id' })
  } else {
    await admin.from('playbook_plays').delete().eq('playbook_id', pid).eq('play_id', ppid)
  }

  revalidatePath(`/playbooks/${pid}`)
  revalidatePath(`/playbooks/${pid}/organise`)
}

export async function reorderPlaybookPlays(
  playbookId: string,
  orderedIds: string[],
): Promise<void> {
  const pid = z.string().uuid().parse(playbookId)
  const ids = z.array(z.string().uuid()).parse(orderedIds)
  const { admin, user } = await requireUser()

  const { data: playbook } = await admin
    .from('playbooks')
    .select('owner_id')
    .eq('id', pid)
    .single()
  if (!playbook || playbook.owner_id !== user.id) throw new Error('Not authorized')

  await admin.from('playbook_plays').upsert(
    ids.map((playId, index) => ({ playbook_id: pid, play_id: playId, sort_order: index })),
    { onConflict: 'playbook_id,play_id' },
  )

  revalidatePath(`/playbooks/${pid}`)
  revalidatePath(`/playbooks/${pid}/organise`)
}

export async function removeMember(formData: FormData): Promise<void> {
  const playbookId = z.string().uuid().parse(formData.get('playbook_id'))
  const userId = z.string().uuid().parse(formData.get('user_id'))
  const { admin, user } = await requireUser()

  const { data: playbook } = await admin
    .from('playbooks')
    .select('owner_id')
    .eq('id', playbookId)
    .single()

  if (!playbook || playbook.owner_id !== user.id) {
    redirect(`/playbooks/${playbookId}?error=Not+authorized`)
  }

  const { error } = await admin
    .from('playbook_members')
    .delete()
    .eq('playbook_id', playbookId)
    .eq('user_id', userId)

  if (error) redirect(`/playbooks/${playbookId}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(`/playbooks/${playbookId}`)
  redirect(`/playbooks/${playbookId}?message=Member+removed`)
}

export async function addPlaybookMemberById(formData: FormData): Promise<void> {
  const playbookId = z.string().uuid().parse(formData.get('playbook_id'))
  const userId = z.string().uuid().parse(formData.get('user_id'))
  const role = roleSchema.parse(formData.get('role') ?? 'viewer')
  const returnPath = z.string().optional().parse(formData.get('return_path') || undefined)
  const { admin, user } = await requireUser()

  // Caller must own the playbook or be an editor
  const { data: playbook } = await admin
    .from('playbooks')
    .select('owner_id, org_id')
    .eq('id', playbookId)
    .single()

  if (!playbook) redirect(`/playbooks/${playbookId}?error=Not+found`)

  const isOwner = playbook.owner_id === user.id
  const { data: callerMembership } = await admin
    .from('playbook_members')
    .select('role')
    .eq('playbook_id', playbookId)
    .eq('user_id', user.id)
    .single()

  // Also allow org head_coach to manage
  let isOrgHeadCoach = false
  if (playbook.org_id) {
    const { data: orgMembership } = await admin
      .from('org_members')
      .select('role')
      .eq('org_id', playbook.org_id)
      .eq('user_id', user.id)
      .single()
    isOrgHeadCoach = orgMembership?.role === 'head_coach'
  }

  if (!isOwner && callerMembership?.role !== 'editor' && !isOrgHeadCoach) {
    const dest = returnPath ?? `/playbooks/${playbookId}`
    redirect(`${dest}?error=Not+authorized`)
  }

  const { error } = await admin
    .from('playbook_members')
    .upsert({ playbook_id: playbookId, user_id: userId, role }, { onConflict: 'playbook_id,user_id' })

  const dest = returnPath ?? `/playbooks/${playbookId}`
  if (error) redirect(`${dest}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(dest)
  if (playbook.org_id) revalidatePath(`/org/${playbook.org_id}`)
  redirect(`${dest}?message=Access+granted`)
}

export async function updatePlaybookMemberRole(formData: FormData): Promise<void> {
  const playbookId = z.string().uuid().parse(formData.get('playbook_id'))
  const userId = z.string().uuid().parse(formData.get('user_id'))
  const role = roleSchema.parse(formData.get('role'))
  const returnPath = z.string().optional().parse(formData.get('return_path') || undefined)
  const { admin, user } = await requireUser()

  const { data: playbook } = await admin
    .from('playbooks')
    .select('owner_id, org_id')
    .eq('id', playbookId)
    .single()

  if (!playbook) redirect(returnPath ?? `/playbooks/${playbookId}`)

  const isOwner = playbook.owner_id === user.id
  let isOrgHeadCoach = false
  if (playbook.org_id) {
    const { data: orgMembership } = await admin
      .from('org_members')
      .select('role')
      .eq('org_id', playbook.org_id)
      .eq('user_id', user.id)
      .single()
    isOrgHeadCoach = orgMembership?.role === 'head_coach'
  }

  if (!isOwner && !isOrgHeadCoach) {
    redirect(`${returnPath ?? `/playbooks/${playbookId}`}?error=Not+authorized`)
  }

  const { error } = await admin
    .from('playbook_members')
    .update({ role })
    .eq('playbook_id', playbookId)
    .eq('user_id', userId)

  const dest = returnPath ?? `/playbooks/${playbookId}`
  if (error) redirect(`${dest}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(dest)
  if (playbook.org_id) revalidatePath(`/org/${playbook.org_id}`)
  redirect(`${dest}?message=Role+updated`)
}
