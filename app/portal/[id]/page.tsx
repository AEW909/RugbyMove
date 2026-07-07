import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PlayerPortal from '@/components/portal/PlayerPortal'
import type { AnimationData } from '@/types/play'

type PageProps = {
  params: { id: string }
}

export default async function PortalPage({ params }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: playbook } = await supabase
    .from('playbooks')
    .select('id, name, owner_id')
    .eq('id', params.id)
    .single()

  if (!playbook) notFound()

  // Access check: owner or playbook member
  const isOwner = playbook.owner_id === user.id
  let hasAccess = isOwner

  if (!hasAccess) {
    const { data: pbMember } = await supabase
      .from('playbook_members')
      .select('role')
      .eq('playbook_id', params.id)
      .eq('user_id', user.id)
      .single()
    if (pbMember) hasAccess = true
  }

  if (!hasAccess) redirect('/?error=Access+denied')

  const { data: rows } = await supabase
    .from('playbook_plays')
    .select('play_id, sort_order, plays(id, title, category, description, animation_data)')
    .eq('playbook_id', params.id)
    .order('sort_order')

  const moves = (rows ?? [])
    .map((row) => {
      const p = row.plays as unknown as {
        id: string
        title: string
        category: string
        description: string | null
        animation_data: AnimationData
      } | null
      if (!p) return null
      return {
        id: p.id,
        title: p.title,
        category: p.category,
        description: p.description,
        animationData: p.animation_data,
      }
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)

  return (
    <PlayerPortal
      playbookName={playbook.name}
      moves={moves}
    />
  )
}
