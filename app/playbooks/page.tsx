import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, Lock, Globe, Users, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import AppHeader from '@/components/AppHeader'

const visibilityIcon = {
  private: Lock,
  team: Users,
  public: Globe,
}

const visibilityLabel = {
  private: 'Private',
  team: 'Team',
  public: 'Public',
}

type PageProps = {
  searchParams: { message?: string; error?: string }
}

export default async function PlaybooksPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: ownedPlaybooks } = await supabase
    .from('playbooks')
    .select('id, name, description, visibility, updated_at')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  const { data: memberPlaybooks } = await supabase
    .from('playbook_members')
    .select('role, playbooks(id, name, description, visibility, updated_at)')
    .eq('user_id', user.id)
    .not('playbooks', 'is', null)

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-8 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 mx-auto max-w-4xl">
        <AppHeader />
        <header className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Playbooks</h1>
            <p className="mt-1 text-sm text-white/60">
              Organise moves into shareable collections.
            </p>
          </div>
          <Link
            href="/playbooks/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New playbook
          </Link>
        </header>

        {searchParams.message && (
          <p className="mb-4 rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-300">
            {searchParams.message}
          </p>
        )}
        {searchParams.error && (
          <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
            {searchParams.error}
          </p>
        )}

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-white">Your playbooks</h2>
          {ownedPlaybooks?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {ownedPlaybooks.map((pb) => {
                const Icon = visibilityIcon[pb.visibility as keyof typeof visibilityIcon] ?? Lock
                return (
                  <Link
                    key={pb.id}
                    href={`/playbooks/${pb.id}`}
                    className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/[0.08]"
                  >
                    <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-white">{pb.name}</h3>
                      {pb.description && (
                        <p className="mt-0.5 truncate text-sm text-white/60">{pb.description}</p>
                      )}
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-300">
                        <Icon className="h-3 w-3" />
                        {visibilityLabel[pb.visibility as keyof typeof visibilityLabel]}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/40">
              No playbooks yet.{' '}
              <Link href="/playbooks/new" className="font-semibold text-blue-400 hover:underline">
                Create one
              </Link>{' '}
              to start organising your moves.
            </div>
          )}
        </section>

        {memberPlaybooks && memberPlaybooks.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Shared with you</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {memberPlaybooks.map((m) => {
                const pb = m.playbooks as unknown as {
                  id: string
                  name: string
                  description: string | null
                  visibility: string
                  updated_at: string
                } | null
                if (!pb) return null
                const Icon = visibilityIcon[pb.visibility as keyof typeof visibilityIcon] ?? Lock
                return (
                  <Link
                    key={pb.id}
                    href={`/playbooks/${pb.id}`}
                    className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/[0.08]"
                  >
                    <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-white">{pb.name}</h3>
                      {pb.description && (
                        <p className="mt-0.5 truncate text-sm text-white/60">{pb.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-300">
                          <Icon className="h-3 w-3" />
                          {visibilityLabel[pb.visibility as keyof typeof visibilityLabel]}
                        </span>
                        <span className="text-xs text-white/40">·</span>
                        <span className="text-xs font-semibold uppercase text-white/40">
                          {m.role}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
