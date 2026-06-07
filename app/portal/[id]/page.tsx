import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PlayerPortal from '@/components/portal/PlayerPortal'
import type { Frame } from '@/types/play'

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
    .select('id, name, description, owner_id, org_id, organisations(name)')
    .eq('id', params.id)
    .single()

  if (!playbook) notFound()

  // Check access: owner, playbook member, or org member
  const isOwner = playbook.owner_id === user.id

  if (!isOwner) {
    const { data: pbMember } = await supabase
      .from('playbook_members')
      .select('role')
      .eq('playbook_id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!pbMember) {
      // Check org membership if playbook belongs to an org
      if (playbook.org_id) {
        const { data: orgMember } = await supabase
          .from('org_members')
          .select('role')
          .eq('org_id', playbook.org_id)
          .eq('user_id', user.id)
          .single()
        if (!orgMember) redirect('/?error=Access+denied')
      } else {
        redirect('/?error=Access+denied')
      }
    }
  }

  const { data: playbookPlays } = await supabase
    .from('playbook_plays')
    .select('play_id, sort_order, plays(id, title, category, description, animation_data)')
    .eq('playbook_id', params.id)
    .order('sort_order')

  type RawPlay = {
    id: string
    title: string
    category: string
    description: string | null
    animation_data: {
      frames?: Frame[]
      durations?: number[]
      pitchPortrait?: boolean
      activePlayers?: string[]
    } | null
  }

  const moves = (playbookPlays ?? [])
    .map((r) => r.plays as unknown as RawPlay | null)
    .filter((p): p is RawPlay => p !== null)
    .map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      description: p.description,
      frames: (p.animation_data?.frames ?? []) as Frame[],
      durations: p.animation_data?.durations ?? [],
      pitchPortrait: p.animation_data?.pitchPortrait ?? false,
      activePlayers: p.animation_data?.activePlayers ?? [],
    }))

  const orgName = playbook.org_id
    ? (playbook.organisations as unknown as { name: string } | null)?.name ?? null
    : null

  return (
    <PlayerPortal
      playbookName={playbook.name}
      playbookDescription={playbook.description ?? null}
      orgName={orgName}
      moves={moves}
    />
  )
}
