'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { animationDataSchema } from '@/lib/board/schema'

const savePlaySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  category: z.enum(['Scrum', 'Lineout', 'Open Play', 'Penalty', 'Kick Off', 'Other']),
  is_public: z.boolean().optional().default(false),
  animation_data: animationDataSchema,
})

const formationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  category: z.enum(['Scrum', 'Lineout', 'Penalty', 'Open Play']),
  slots: z.array(
    z.object({
      side: z.enum(['attack', 'defend', 'ball']),
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
    }),
  ),
})

export type SavePlayInput = z.input<typeof savePlaySchema>
export type SaveFormationInput = z.input<typeof formationSchema>

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('You must be signed in to manage plays.')
  }

  return { supabase, user }
}

export async function savePlay(input: SavePlayInput) {
  let parsed: z.infer<typeof savePlaySchema>
  try {
    parsed = savePlaySchema.parse(input)
  } catch (e) {
    if (e instanceof z.ZodError) {
      const detail = e.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ')
      console.error('[savePlay] validation failed:', detail)
      throw new Error(`Save rejected — invalid data (${detail})`)
    }
    throw e
  }

  const { supabase, user } = await requireUser()

  const { data, error } = await supabase
    .from('plays')
    .upsert(
      {
        ...parsed,
        user_id: user.id,
      },
      { onConflict: 'id' },
    )
    .select('id')
    .single()

  if (error) {
    console.error('[savePlay] upsert failed:', error.message)
    throw new Error(`Save failed: ${error.message}`)
  }

  if (parsed.id && data.id !== parsed.id) {
    console.warn(
      `[savePlay] upsert returned id ${data.id}, expected ${parsed.id} — the write may not have targeted the intended row (check RLS policies).`,
    )
  }

  revalidatePath('/')
  revalidatePath(`/playbook/${data.id}`)

  return data
}

export async function savePlayToPlaybook(input: SavePlayInput, playbookId: string) {
  const parsedPlaybookId = z.string().uuid().parse(playbookId)
  const play = await savePlay(input)

  const { supabase } = await requireUser()
  const { error } = await supabase
    .from('playbook_plays')
    .upsert(
      { playbook_id: parsedPlaybookId, play_id: play.id },
      { onConflict: 'playbook_id,play_id' },
    )

  if (error) {
    console.error('[savePlayToPlaybook] linking failed:', error.message)
    throw new Error(`Saved the move, but linking it to the playbook failed: ${error.message}`)
  }

  revalidatePath(`/playbooks/${parsedPlaybookId}`)

  return play
}

export async function duplicatePlay(formData: FormData): Promise<void> {
  const id = z.string().uuid().parse(formData.get('play_id'))
  const playbookId = z.string().uuid().optional().parse(formData.get('playbook_id') || undefined)
  const { supabase, user } = await requireUser()

  const { data: original, error: fetchErr } = await supabase
    .from('plays')
    .select('title, description, category, animation_data')
    .eq('id', id)
    .single()

  if (fetchErr || !original) throw new Error('Play not found.')

  const { data: copy, error: insertErr } = await supabase
    .from('plays')
    .insert({
      user_id: user.id,
      title: `${original.title} (copy)`,
      description: original.description,
      category: original.category,
      animation_data: original.animation_data,
    })
    .select('id')
    .single()

  if (insertErr || !copy) throw new Error(insertErr?.message ?? 'Failed to duplicate.')

  if (playbookId) {
    const { data: maxRow } = await supabase
      .from('playbook_plays')
      .select('sort_order')
      .eq('playbook_id', playbookId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    await supabase.from('playbook_plays').insert({
      playbook_id: playbookId,
      play_id: copy.id,
      sort_order: (maxRow?.sort_order ?? 0) + 1,
    })
    revalidatePath(`/playbooks/${playbookId}`)
  }

  revalidatePath('/')
  revalidatePath(`/playbook/${copy.id}`)
}

export async function deletePlay(formData: FormData): Promise<void> {
  const id = z.string().uuid().parse(formData.get('id'))
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('plays').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/account')
  redirect('/')
}

export async function saveFormation(input: SaveFormationInput) {
  let parsed: z.infer<typeof formationSchema>
  try {
    parsed = formationSchema.parse(input)
  } catch (e) {
    if (e instanceof z.ZodError) {
      const detail = e.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ')
      console.error('[saveFormation] validation failed:', detail)
      throw new Error(`Save rejected — invalid data (${detail})`)
    }
    throw e
  }

  const { supabase, user } = await requireUser()

  const { data, error } = await supabase
    .from('formations')
    .upsert(
      {
        ...parsed,
        user_id: user.id,
      },
      { onConflict: 'id' },
    )
    .select('id,name,category,slots,updated_at')
    .single()

  if (error) {
    console.error('[saveFormation] upsert failed:', error.message)
    throw new Error(`Save failed: ${error.message}`)
  }

  revalidatePath('/')

  return data
}

export async function deleteFormation(id: string) {
  const parsedId = z.string().uuid().parse(id)
  const { supabase } = await requireUser()

  const { error } = await supabase.from('formations').delete().eq('id', parsedId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')

  return { id: parsedId }
}
