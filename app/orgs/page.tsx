import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Users, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { joinViaCode } from '@/app/actions/orgs'

type PageProps = {
  searchParams: { message?: string; error?: string }
}

const roleLabel: Record<string, string> = {
  head_coach: 'Head Coach',
  coach: 'Coach',
  player: 'Player',
}

export default async function OrgsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('org_members')
    .select('role, organisations(id, name, description)')
    .eq('user_id', user.id)
    .order('joined_at')

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-8 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 mx-auto max-w-4xl">
        <header className="mb-6 flex items-end justify-between border-b border-white/10 pb-5">
          <div>
            <Link href="/" className="text-sm font-medium text-white/40 transition-colors hover:text-white">
              ← Home
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">My Organisations</h1>
            <p className="mt-1 text-sm text-white/60">Manage your squads and coaching teams.</p>
          </div>
          <Link
            href="/orgs/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New org
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

        {memberships && memberships.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {memberships.map((m) => {
              const org = m.organisations as unknown as {
                id: string
                name: string
                description: string | null
              } | null
              if (!org) return null
              return (
                <Link
                  key={org.id}
                  href={`/org/${org.id}`}
                  className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/[0.08]"
                >
                  <Users className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-white">{org.name}</h3>
                    {org.description && (
                      <p className="mt-0.5 truncate text-sm text-white/60">{org.description}</p>
                    )}
                    <span className="mt-2 inline-block rounded-full border border-blue-500/20 bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-300">
                      {roleLabel[m.role] ?? m.role}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">
            <Users className="mx-auto mb-3 h-8 w-8 text-white/20" />
            <p>No organisations yet.</p>
            <p className="mt-1">
              <Link href="/orgs/new" className="font-semibold text-blue-400 hover:underline">
                Create one
              </Link>{' '}
              or join via a playbook code below.
            </p>
          </div>
        )}

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-white">Join via code</h2>
          <form action={joinViaCode} className="flex max-w-sm gap-2">
            <input
              name="code"
              type="text"
              required
              placeholder="e.g. A1B2C3D4"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm uppercase text-white placeholder:normal-case placeholder:text-white/30 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
            />
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
            >
              Join
            </button>
          </form>
          <p className="mt-2 text-xs text-white/40">
            Ask your coach for the playbook join code.
          </p>
        </section>
      </div>
    </main>
  )
}
