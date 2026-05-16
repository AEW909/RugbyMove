import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, Lock, Globe, Users, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

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
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-end justify-between border-b border-emerald-900/10 pb-5">
          <div>
            <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-800">
              ← Home
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Playbooks</h1>
            <p className="mt-1 text-sm text-slate-600">
              Organise moves into shareable collections.
            </p>
          </div>
          <Link
            href="/playbooks/new"
            className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New playbook
          </Link>
        </header>

        {searchParams.message && (
          <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            {searchParams.message}
          </p>
        )}
        {searchParams.error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {searchParams.error}
          </p>
        )}

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Your playbooks</h2>
          {ownedPlaybooks?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {ownedPlaybooks.map((pb) => {
                const Icon = visibilityIcon[pb.visibility as keyof typeof visibilityIcon] ?? Lock
                return (
                  <Link
                    key={pb.id}
                    href={`/playbooks/${pb.id}`}
                    className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-700"
                  >
                    <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{pb.name}</h3>
                      {pb.description && (
                        <p className="mt-0.5 truncate text-sm text-slate-500">{pb.description}</p>
                      )}
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold uppercase text-slate-400">
                        <Icon className="h-3 w-3" />
                        {visibilityLabel[pb.visibility as keyof typeof visibilityLabel]}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              No playbooks yet.{' '}
              <Link href="/playbooks/new" className="font-semibold text-emerald-700 hover:underline">
                Create one
              </Link>{' '}
              to start organising your moves.
            </div>
          )}
        </section>

        {memberPlaybooks && memberPlaybooks.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Shared with you</h2>
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
                    className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-700"
                  >
                    <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{pb.name}</h3>
                      {pb.description && (
                        <p className="mt-0.5 truncate text-sm text-slate-500">{pb.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-slate-400">
                          <Icon className="h-3 w-3" />
                          {visibilityLabel[pb.visibility as keyof typeof visibilityLabel]}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs font-semibold uppercase text-slate-400">
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
