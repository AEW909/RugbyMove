'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const pointSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
})

const animationDataSchema = z.object({
  frames: z
    .array(
      z.object({
        players: z.array(
          z.object({
            id: z.string().min(1).max(12),
            x: z.number().min(0).max(100),
            y: z.number().min(0).max(100),
          }),
        ),
        lines: z.array(
          z.object({
            id: z.string().min(1).max(64),
            from: pointSchema,
            to: pointSchema,
            color: z.string().max(32).optional(),
            dashed: z.boolean().optional(),
          }),
        ),
      }),
    )
    .min(1),
})

const savePlaySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  category: z.enum(['Attacking', 'Defending', 'SetPiece']),
  animation_data: animationDataSchema,
  is_public: z.boolean().default(false),
})

const formationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  players: z.array(
    z.object({
      id: z.string().min(1).max(12),
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
  const parsed = savePlaySchema.parse(input)
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
    throw new Error(error.message)
  }

  revalidatePath('/')
  revalidatePath(`/playbook/${data.id}`)

  return data
}

export async function setPlayVisibility(formData: FormData): Promise<void> {
  const id = z.string().uuid().parse(formData.get('id'))
  const is_public = formData.get('is_public') === 'true'
  const { supabase, user } = await requireUser()
  const { error } = await supabase
    .from('plays')
    .update({ is_public })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath(`/playbook/${id}`)
  revalidatePath('/')
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
  const parsed = formationSchema.parse(input)
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
    .select('id,name,players,updated_at')
    .single()

  if (error) {
    throw new Error(error.message)
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
