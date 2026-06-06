import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays } from 'lucide-react'
import TacticalBoard from '@/components/TacticalBoard'
import { createClient } from '@/lib/supabase/server'
import type { AnimationData, Play } from '@/types/play'

type PageProps = {
  params: { id: string }
  searchParams: { from?: string }
}

const demoAnimationData: AnimationData = {
  frames: [
    {
      players: [
        ...Array.from({ length: 15 }, (_, index) => ({
          id: `attack-${index + 1}`,
          x: 18 + (index % 5) * 8,
          y: 22 + Math.floor(index / 5) * 12,
        })),
        ...Array.from({ length: 15 }, (_, index) => ({
          id: `defend-${index + 1}`,
          x: 55 + (index % 5) * 7,
          y: 24 + Math.floor(index / 5) * 12,
        })),
        { id: 'ball', x: 34, y: 46 },
      ],
      zones: [],
      lines: [],
    },
    {
      players: [
        ...Array.from({ length: 15 }, (_, index) => ({
          id: `attack-${index + 1}`,
          x: 24 + (index % 5) * 8,
          y: 18 + Math.floor(index / 5) * 12,
        })),
        ...Array.from({ length: 15 }, (_, index) => ({
          id: `defend-${index + 1}`,
          x: 59 + (index % 5) * 7,
          y: 22 + Math.floor(index / 5) * 12,
        })),
        { id: 'ball', x: 49, y: 39 },
      ],
      zones: [],
      lines: [],
    },
  ],
}

async function getPlay(id: string): Promise<Play | null> {
  if (id === 'new') {
    return {
      id,
      user_id: 'new',
      title: 'New move',
      description: 'Start from a blank board or load one of your saved formations.',
      category: 'Other' as const,
      animation_data: { frames: [] },
      updated_at: new Date().toISOString(),
      profiles: null,
    }
  }

  if (id === 'demo') {
    return {
      id: 'demo',
      user_id: 'demo',
      title: 'Wide pod launch',
      description:
        'A simple two-frame pattern that shifts the defensive line before releasing the ball wide.',
      category: 'Open Play' as const,
      animation_data: demoAnimationData,
      updated_at: new Date().toISOString(),
      profiles: {
        username: 'coach-demo',
      },
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plays')
    .select(
      'id,user_id,title,description,category,animation_data,updated_at,profiles(username)',
    )
    .eq('id', id)
    .single()

  if (error) {
    return null
  }

  const row = data as Omit<Play, 'profiles'> & {
    profiles:
      | { username: string | null }
      | { username: string | null }[]
      | null
  }

  return {
    ...row,
    profiles: Array.isArray(row.profiles) ? (row.profiles[0] ?? null) : row.profiles,
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const play = await getPlay(params.id)

  if (!play) {
    return {
      title: 'Play not found',
    }
  }

  const description =
    play.description ??
    `${play.category} Rugby Union tactical play by ${play.profiles?.username ?? 'RugbyMove'}`

  return {
    title: play.title,
    description,
    openGraph: {
      title: `${play.title} | RugbyMove`,
      description,
      type: 'article',
      url: `/playbook/${play.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: play.title,
      description,
    },
  }
}

export default async function PlaybookPage({ params, searchParams }: PageProps) {
  const play = await getPlay(params.id)

  if (!play) {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isGuest = !user
  const mode = play.id === 'new' ? 'fresh' : 'saved'
  const isOwner = user && play.user_id === user.id
  const viewOnly = mode === 'saved' && !isOwner

  // Resolve back-link when navigating from a playbook
  const fromId = searchParams?.from
  let fromPlaybook: { id: string; name: string } | null = null
  if (fromId) {
    const { data } = await supabase
      .from('playbooks')
      .select('id, name')
      .eq('id', fromId)
      .single()
    fromPlaybook = data ?? null
  }

  const backHref = fromPlaybook ? `/playbooks/${fromPlaybook.id}` : '/'
  const backLabel = fromPlaybook ? `← ${fromPlaybook.name}` : '← Home'

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-black text-white">
      {/* BG gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      {/* Compact top bar */}
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-2 sm:px-6">
        <Link href={backHref} className="text-sm font-medium text-white/40 transition-colors hover:text-white">
          {backLabel}
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold uppercase text-white/50 sm:inline">
            {play.category}
          </span>
          <h1 className="truncate text-sm font-bold text-white">{play.title}</h1>
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 text-xs text-white/40 sm:inline-flex">
          <CalendarDays className="h-3.5 w-3.5" />
          {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(play.updated_at))}
        </span>
      </header>

      {/* Board fills remaining space */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        <TacticalBoard
          initialFrames={play.animation_data.frames}
          initialDurations={play.animation_data.durations}
          initialPitchPortrait={play.animation_data.pitchPortrait}
playId={play.id}
          mode={mode}
          playTitle={play.title}
          playDescription={play.description}
          playCategory={play.category}
          viewOnly={viewOnly}
        />

        {isGuest && (
          <div className="shrink-0 border-t border-white/10 px-4 py-2 text-center">
            <p className="text-xs text-white/60">
              Build and save your own moves.{' '}
              <Link href="/signup" className="font-semibold text-blue-400 transition-colors hover:text-blue-300">
                Create a free account
              </Link>{' '}
              to get started.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
