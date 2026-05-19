import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, Lock, Share2 } from 'lucide-react'
import TacticalBoard from '@/components/TacticalBoard'
import { createClient } from '@/lib/supabase/server'
import type { AnimationData, Play } from '@/types/play'

type PageProps = {
  params: { id: string }
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
      lines: [],
    },
  ],
}

async function getPlay(id: string): Promise<Play | null> {
  if (id === 'new' || id === 'local') {
    return {
      id,
      user_id: 'local',
      title: id === 'local' ? 'Saved move' : 'New move',
      description:
        id === 'local'
          ? 'Continue editing a locally saved move.'
          : 'Start from a blank board or load one of your saved formations.',
      category: 'Attacking',
      animation_data: { frames: [] },
      is_public: false,
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
      category: 'Attacking',
      animation_data: demoAnimationData,
      is_public: true,
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
      'id,user_id,title,description,category,animation_data,is_public,updated_at,profiles(username)',
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

export default async function PlaybookPage({ params }: PageProps) {
  const play = await getPlay(params.id)

  if (!play) {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isGuest = !user

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-6 text-white sm:px-8">
      {/* BG gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <Link href="/" className="text-sm font-medium text-white/40 transition-colors hover:text-white">
            ← Home
          </Link>
          <div>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold uppercase text-white/60">
              {play.category}
            </span>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-5xl">{play.title}</h1>
            {play.description ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60 sm:text-base">
                {play.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/40">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(
                new Date(play.updated_at),
              )}
            </span>
            <span className="inline-flex items-center gap-2">
              {play.is_public ? <Share2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {play.is_public ? 'Public' : 'Private'}
            </span>
          </div>
        </header>

        <TacticalBoard
          initialFrames={play.animation_data.frames}
          playId={play.id}
          mode={play.id === 'new' ? 'fresh' : play.id === 'local' ? 'local' : 'saved'}
          playTitle={play.title}
          playDescription={play.description}
          playCategory={play.category}
          isPublic={play.is_public}
          isGuest={isGuest}
        />
      </div>
    </main>
  )
}
