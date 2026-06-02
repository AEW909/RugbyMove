'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { OrgRole } from '@/types/play'

const orgRoleSchema = z.enum(['head_coach', 'coach', 'player'])

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

async function requireOrgRole(orgId: string, requiredRole: OrgRole) {
  const { admin, user } = await requireUser()
  const { data: member } = await admin
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (!member) throw new Error('You are not a member of this organisation.')

  const hierarchy: OrgRole[] = ['player', 'coach', 'head_coach']
  if (hierarchy.indexOf(member.role as OrgRole) < hierarchy.indexOf(requiredRole)) {
    throw new Error('You do not have permission to perform this action.')
  }

  return { admin, user, role: member.role as OrgRole }
}

function generateJoinCodeValue(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function joinViaCode(formData: FormData): Promise<void> {
  const code = z.string().trim().min(4).max(12).parse(formData.get('code'))
  const upperCode = code.toUpperCase()

  let orgId: string | null = null
  let playbookId: string | null = null
  let errorMessage: string | null = null

  try {
    const { admin, user } = await requireUser()

    const { data: playbook, error: pbError } = await admin
      .from('playbooks')
      .select('id, org_id')
      .eq('join_code', upperCode)
      .single()

    if (pbError || !playbook) {
      errorMessage = 'Invalid join code. Please check and try again.'
    } else {
      playbookId = playbook.id
      orgId = playbook.org_id ?? null

      // Add to playbook_members (viewer role, ignore if already a member)
      const { error: memberError } = await admin
        .from('playbook_members')
        .upsert(
          { playbook_id: playbook.id, user_id: user.id, role: 'viewer' },
          { onConflict: 'playbook_id,user_id', ignoreDuplicates: true },
        )
      if (memberError) errorMessage = memberError.message

      // If it's an org playbook, also add to org_members as player
      if (!errorMessage && playbook.org_id) {
        await admin
          .from('org_members')
          .upsert(
            { org_id: playbook.org_id, user_id: user.id, role: 'player' },
            { onConflict: 'org_id,user_id' },
          )
      }
    }
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'Something went wrong.'
  }

  if (errorMessage) {
    redirect(`/join?error=${encodeURIComponent(errorMessage)}`)
  }
  // Redirect to org page if this is an org playbook, otherwise to the playbook itself
  if (orgId) {
    redirect(`/org/${orgId}?message=Successfully+joined`)
  }
  redirect(`/playbooks/${playbookId}`)
}

export async function generatePlaybookJoinCode(formData: FormData): Promise<void> {
  const playbookId = z.string().uuid().parse(formData.get('playbook_id'))
  const orgId = z.string().uuid().parse(formData.get('org_id'))

  let errorMessage: string | null = null

  try {
    const { admin } = await requireOrgRole(orgId, 'coach')

    let code = generateJoinCodeValue()
    let attempts = 0
    while (attempts < 5) {
      const { data: existing } = await admin
        .from('playbooks')
        .select('id')
        .eq('join_code', code)
        .maybeSingle()
      if (!existing) break
      code = generateJoinCodeValue()
      attempts++
    }

    const { error } = await admin
      .from('playbooks')
      .update({ join_code: code })
      .eq('id', playbookId)

    if (error) errorMessage = error.message
    else revalidatePath(`/org/${orgId}`)
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'Something went wrong.'
  }

  if (errorMessage) {
    redirect(`/org/${orgId}?error=${encodeURIComponent(errorMessage)}`)
  }
  redirect(`/org/${orgId}`)
}

export async function createOrgPlaybook(formData: FormData): Promise<void> {
  const orgId = z.string().uuid().parse(formData.get('org_id'))
  const name = z.string().trim().min(1).max(120).parse(formData.get('name'))
  const description =
    z
      .string()
      .trim()
      .max(2000)
      .optional()
      .nullable()
      .parse(formData.get('description') || null) ?? null

  let errorMessage: string | null = null
  let playbookId: string | null = null

  try {
    const { admin, user } = await requireOrgRole(orgId, 'coach')

    const { data, error } = await admin
      .from('playbooks')
      .insert({ org_id: orgId, owner_id: user.id, name, description, visibility: 'team' })
      .select('id')
      .single()

    if (error) errorMessage = error.message
    else {
      playbookId = data.id
      revalidatePath(`/org/${orgId}`)
    }
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'Something went wrong.'
  }

  if (errorMessage) {
    redirect(`/org/${orgId}?error=${encodeURIComponent(errorMessage)}`)
  }
  redirect(`/playbooks/${playbookId}`)
}

export async function assignCoachToPlaybook(formData: FormData): Promise<void> {
  const orgId = z.string().uuid().parse(formData.get('org_id'))
  const playbookId = z.string().uuid().parse(formData.get('playbook_id'))
  const userId = z.string().uuid().parse(formData.get('user_id'))

  let errorMessage: string | null = null

  try {
    const { admin } = await requireOrgRole(orgId, 'head_coach')

    const { error } = await admin
      .from('playbook_members')
      .upsert(
        { playbook_id: playbookId, user_id: userId, role: 'editor' },
        { onConflict: 'playbook_id,user_id' },
      )

    if (error) errorMessage = error.message
    else revalidatePath(`/org/${orgId}`)
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'Something went wrong.'
  }

  if (errorMessage) {
    redirect(`/org/${orgId}?error=${encodeURIComponent(errorMessage)}`)
  }
  redirect(`/org/${orgId}`)
}

export async function updateOrgMemberRole(formData: FormData): Promise<void> {
  const orgId = z.string().uuid().parse(formData.get('org_id'))
  const userId = z.string().uuid().parse(formData.get('user_id'))
  const role = orgRoleSchema.parse(formData.get('role'))

  let errorMessage: string | null = null

  try {
    const { admin } = await requireOrgRole(orgId, 'head_coach')

    const { error } = await admin
      .from('org_members')
      .update({ role })
      .eq('org_id', orgId)
      .eq('user_id', userId)

    if (error) errorMessage = error.message
    else revalidatePath(`/org/${orgId}`)
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'Something went wrong.'
  }

  if (errorMessage) {
    redirect(`/org/${orgId}?error=${encodeURIComponent(errorMessage)}`)
  }
  redirect(`/org/${orgId}`)
}

export async function removeOrgMember(formData: FormData): Promise<void> {
  const orgId = z.string().uuid().parse(formData.get('org_id'))
  const userId = z.string().uuid().parse(formData.get('user_id'))

  let errorMessage: string | null = null

  try {
    const { admin } = await requireOrgRole(orgId, 'head_coach')

    const { error } = await admin
      .from('org_members')
      .delete()
      .eq('org_id', orgId)
      .eq('user_id', userId)

    if (error) errorMessage = error.message
    else revalidatePath(`/org/${orgId}`)
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'Something went wrong.'
  }

  if (errorMessage) {
    redirect(`/org/${orgId}?error=${encodeURIComponent(errorMessage)}`)
  }
  redirect(`/org/${orgId}`)
}

export async function createOrg(formData: FormData): Promise<void> {
  const name = z.string().trim().min(1).max(120).parse(formData.get('name'))
  const description =
    z.string().trim().max(2000).optional().nullable().parse(formData.get('description') || null) ?? null

  let errorMessage: string | null = null
  let orgId: string | null = null

  try {
    const { admin, user } = await requireUser()

    const { data: org, error: orgError } = await admin
      .from('organisations')
      .insert({ name, description, owner_id: user.id })
      .select('id')
      .single()

    if (orgError) {
      errorMessage = orgError.message
    } else {
      orgId = org.id
      const { error: memberError } = await admin
        .from('org_members')
        .insert({ org_id: org.id, user_id: user.id, role: 'head_coach' })
      if (memberError) errorMessage = memberError.message
    }
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'Something went wrong.'
  }

  if (errorMessage) {
    redirect(`/orgs/new?error=${encodeURIComponent(errorMessage)}`)
  }
  redirect(`/org/${orgId}`)
}

export async function deleteOrgPlaybook(formData: FormData): Promise<void> {
  const orgId = z.string().uuid().parse(formData.get('org_id'))
  const playbookId = z.string().uuid().parse(formData.get('playbook_id'))

  let errorMessage: string | null = null

  try {
    const { admin } = await requireOrgRole(orgId, 'head_coach')

    const { error } = await admin
      .from('playbooks')
      .delete()
      .eq('id', playbookId)
      .eq('org_id', orgId)

    if (error) errorMessage = error.message
    else revalidatePath(`/org/${orgId}`)
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'Something went wrong.'
  }

  if (errorMessage) {
    redirect(`/org/${orgId}?error=${encodeURIComponent(errorMessage)}`)
  }
  redirect(`/org/${orgId}`)
}
