'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
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

const visibilitySchema = z.enum(['private', 'team'])
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
    .select('owner_id')
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

  if (!isOwner && callerMembership?.role !== 'editor') {
    const dest = returnPath ?? `/playbooks/${playbookId}`
    redirect(`${dest}?error=Not+authorized`)
  }

  const { error } = await admin
    .from('playbook_members')
    .upsert({ playbook_id: playbookId, user_id: userId, role }, { onConflict: 'playbook_id,user_id' })

  const dest = returnPath ?? `/playbooks/${playbookId}`
  if (error) redirect(`${dest}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(dest)
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
    .select('owner_id')
    .eq('id', playbookId)
    .single()

  if (!playbook) redirect(returnPath ?? `/playbooks/${playbookId}`)

  const isOwner = playbook.owner_id === user.id

  if (!isOwner) {
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
  redirect(`${dest}?message=Role+updated`)
}

export async function setPlaybookJoinCode(formData: FormData): Promise<void> {
  const playbookId = z.string().uuid().parse(formData.get('playbook_id'))
  const { admin, user } = await requireUser()

  const { data: playbook } = await admin
    .from('playbooks')
    .select('owner_id')
    .eq('id', playbookId)
    .single()

  if (!playbook || playbook.owner_id !== user.id) {
    redirect(`/playbooks/${playbookId}?error=Not+authorized`)
  }

  const code = randomBytes(4).toString('hex').toUpperCase()

  const { error } = await admin
    .from('playbooks')
    .update({ join_code: code })
    .eq('id', playbookId)

  if (error) redirect(`/playbooks/${playbookId}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(`/playbooks/${playbookId}`)
  redirect(`/playbooks/${playbookId}?message=Join+code+generated`)
}

export async function joinPlaybookByCode(formData: FormData): Promise<void> {
  let errorMessage: string | null = null
  let playbookId: string | null = null

  try {
    const code = z.string().trim().min(1).parse(formData.get('code'))
    const { admin, user } = await requireUser()

    const { data: playbook, error } = await admin
      .from('playbooks')
      .select('id')
      .eq('join_code', code)
      .single()

    if (error || !playbook) {
      errorMessage = 'No playbook found with that code.'
    } else {
      const { error: memberError } = await admin
        .from('playbook_members')
        .upsert(
          { playbook_id: playbook.id, user_id: user.id, role: 'viewer' },
          { onConflict: 'playbook_id,user_id' },
        )

      if (memberError) {
        errorMessage = memberError.message
      } else {
        playbookId = playbook.id
        revalidatePath(`/playbooks/${playbook.id}`)
      }
    }
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'Something went wrong.'
  }

  if (errorMessage) {
    redirect(`/join?error=${encodeURIComponent(errorMessage)}`)
  }
  redirect(`/playbooks/${playbookId}?message=Joined+successfully`)
}
