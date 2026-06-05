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
  const admin = createAdminClient()
  return { supabase, admin, user: user! }
}

export async function createOrg(formData: FormData): Promise<void> {
  let id: string | null = null
  let errorMessage: string | null = null

  try {
    const name = z.string().trim().min(1).max(120).parse(formData.get('name'))
    const description =
      z.string().trim().max(2000).optional().nullable().parse(
        formData.get('description') || null,
      ) ?? null

    const { admin, user } = await requireUser()

    const { data, error } = await admin
      .from('organisations')
      .insert({ name, description, owner_id: user.id })
      .select('id')
      .single()

    if (error) {
      errorMessage = error.message
    } else {
      id = data.id
      await admin
        .from('org_members')
        .insert({ org_id: id, user_id: user.id, role: 'head_coach' })
      revalidatePath('/')
      revalidatePath('/orgs')
    }
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'Something went wrong.'
  }

  if (errorMessage) {
    redirect(`/orgs/new?error=${encodeURIComponent(errorMessage)}`)
  }
  redirect(`/org/${id}`)
}

export async function joinViaCode(formData: FormData): Promise<void> {
  let errorMessage: string | null = null
  let playbookId: string | null = null

  try {
    const code = z.string().trim().min(1).parse(formData.get('code'))
    const { admin, user } = await requireUser()

    const { data: playbook, error } = await admin
      .from('playbooks')
      .select('id, org_id')
      .eq('join_code', code)
      .single()

    if (error || !playbook) {
      errorMessage = 'No playbook found with that code.'
    } else {
      playbookId = playbook.id
      const { error: memberError } = await admin
        .from('playbook_members')
        .upsert(
          { playbook_id: playbook.id, user_id: user.id, role: 'viewer' },
          { onConflict: 'playbook_id,user_id' },
        )

      if (memberError) {
        errorMessage = memberError.message
      } else if (playbook.org_id) {
        await admin
          .from('org_members')
          .upsert(
            { org_id: playbook.org_id, user_id: user.id, role: 'player' },
            { onConflict: 'org_id,user_id' },
          )
        revalidatePath(`/org/${playbook.org_id}`)
        redirect(`/org/${playbook.org_id}?message=Joined+successfully`)
      } else {
        revalidatePath(`/playbooks/${playbook.id}`)
        redirect(`/playbooks/${playbook.id}?message=Joined+successfully`)
      }
    }
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'Something went wrong.'
  }

  if (errorMessage) {
    redirect(`/orgs?error=${encodeURIComponent(errorMessage)}`)
  }
}

export async function deleteOrgPlaybook(formData: FormData): Promise<void> {
  const orgId = z.string().uuid().parse(formData.get('org_id'))
  const playbookId = z.string().uuid().parse(formData.get('playbook_id'))
  const { admin, user } = await requireUser()

  const { data: member } = await admin
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (!member || member.role !== 'head_coach') {
    redirect(`/org/${orgId}?error=Not+authorized`)
  }

  const { error } = await admin
    .from('playbooks')
    .delete()
    .eq('id', playbookId)
    .eq('org_id', orgId)

  if (error) redirect(`/org/${orgId}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(`/org/${orgId}`)
  redirect(`/org/${orgId}?message=Playbook+deleted`)
}

export async function addOrgMember(formData: FormData): Promise<void> {
  const orgId = z.string().uuid().parse(formData.get('org_id'))
  const username = z.string().trim().min(1).max(80).parse(formData.get('username'))
  const role = z.enum(['coach', 'player']).parse(formData.get('role') ?? 'coach')
  const { admin, supabase, user } = await requireUser()

  const { data: myMembership } = await admin
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (!myMembership || myMembership.role !== 'head_coach') {
    redirect(`/org/${orgId}?error=Not+authorized`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (!profile) {
    redirect(`/org/${orgId}?error=${encodeURIComponent(`No user found with username "${username}".`)}`)
  }

  const { error } = await admin
    .from('org_members')
    .upsert({ org_id: orgId, user_id: profile.id, role }, { onConflict: 'org_id,user_id' })

  if (error) redirect(`/org/${orgId}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(`/org/${orgId}`)
  redirect(`/org/${orgId}?message=Member+added`)
}

export async function removeOrgMember(formData: FormData): Promise<void> {
  const orgId = z.string().uuid().parse(formData.get('org_id'))
  const userId = z.string().uuid().parse(formData.get('user_id'))
  const { admin, user } = await requireUser()

  const { data: myMembership } = await admin
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (!myMembership || myMembership.role !== 'head_coach') {
    redirect(`/org/${orgId}?error=Not+authorized`)
  }

  if (userId === user.id) {
    redirect(`/org/${orgId}?error=Cannot+remove+yourself`)
  }

  const { error } = await admin
    .from('org_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId)

  if (error) redirect(`/org/${orgId}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(`/org/${orgId}`)
  redirect(`/org/${orgId}?message=Member+removed`)
}

export async function setPlaybookJoinCode(formData: FormData): Promise<void> {
  const orgId = z.string().uuid().parse(formData.get('org_id'))
  const playbookId = z.string().uuid().parse(formData.get('playbook_id'))
  const { admin, user } = await requireUser()

  const { data: member } = await admin
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (!member || member.role !== 'head_coach') {
    redirect(`/org/${orgId}?error=Not+authorized`)
  }

  const code = randomBytes(4).toString('hex').toUpperCase()

  const { error } = await admin
    .from('playbooks')
    .update({ join_code: code })
    .eq('id', playbookId)
    .eq('org_id', orgId)

  if (error) redirect(`/org/${orgId}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(`/org/${orgId}`)
  redirect(`/org/${orgId}?message=Join+code+generated`)
}
