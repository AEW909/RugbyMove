import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BookOpen, Key, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { setPlaybookJoinCode } from '@/app/actions/orgs'
import DeleteOrgPlaybookButton from '@/components/orgs/DeleteOrgPlaybookButton'

type PageProps = {
  params: { id: string }
  searchParams: { message?: string; error?: string }
}

const roleLabel: Record<string, string> = {
  head_coach: 'Head Coach',
  coach: 'Coach',
  player: 'Player',
}

export default async function OrgDetailPage({ params, searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations')
    .select('id, name, description, owner_id')
    .eq('id', params.id)
    .single()

  if (!org) notFound()

  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/')

  const isHeadCoach = membership.role === 'head_coach'

  const [{ data: playbooks }, { data: members }] = await Promise.all([
    supabase
      .from('playbooks')
      .select('id, name, description, visibility, join_code')
      .eq('org_id', params.id)
      .order('name'),
    supabase
      .from('org_members')
      .select('user_id, role, profiles(username)')
      .eq('org_id', params.id)
      .order('joined_at'),
  ])

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-8 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 mx-auto max-w-4xl">
        <Link href="/orgs" className="text-sm font-medium text-white/40 transition-colors hover:text-white">
          ← Organisations
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Users className="mt-1 h-7 w-7 shrink-0 text-blue-400" />
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">{org.name}</h1>
              {org.description && (
                <p className="mt-1 text-sm text-white/60">{org.description}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-blue-500/20 bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-300">
                  {roleLabel[membership.role] ?? membership.role}
                </span>
                <span className="text-xs text-white/30">·</span>
                <span className="text-xs text-white/50">
                  {members?.length ?? 0} {(members?.length ?? 0) === 1 ? 'member' : 'members'}
                </span>
                <span className="text-xs text-white/30">·</span>
                <span className="text-xs text-white/50">
                  {playbooks?.length ?? 0} {(playbooks?.length ?? 0) === 1 ? 'playbook' : 'playbooks'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {searchParams.message && (
          <p className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-300">
            {searchParams.message}
          </p>
        )}
        {searchParams.error && (
          <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
            {searchParams.error}
          </p>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
          {/* Left: playbooks */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white">Playbooks</h2>
              {isHeadCoach && (
                <Link
                  href={`/playbooks/new?org_id=${params.id}`}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                >
                  + New
                </Link>
              )}
            </div>

            {playbooks && playbooks.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {playbooks.map((pb) => (
                  <li
                    key={pb.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/playbooks/${pb.id}`}
                          className="flex items-center gap-2 font-semibold text-white transition-colors hover:text-blue-400"
                        >
                          <BookOpen className="h-4 w-4 shrink-0 text-blue-400" />
                          <span className="truncate">{pb.name}</span>
                        </Link>
                        {pb.description && (
                          <p className="mt-1 truncate text-xs text-white/50">{pb.description}</p>
                        )}
                      </div>
                      {isHeadCoach && (
                        <DeleteOrgPlaybookButton
                          orgId={params.id}
                          playbookId={pb.id}
                          playbookName={pb.name}
                        />
                      )}
                    </div>

                    {isHeadCoach && (
                      <div className="mt-3 flex items-center gap-2">
                        {pb.join_code ? (
                          <div className="flex items-center gap-2">
                            <code className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs font-mono font-bold tracking-widest text-white/70">
                              {pb.join_code}
                            </code>
                            <form action={setPlaybookJoinCode}>
                              <input type="hidden" name="org_id" value={params.id} />
                              <input type="hidden" name="playbook_id" value={pb.id} />
                              <button
                                type="submit"
                                className="text-xs text-white/40 transition hover:text-white/70"
                              >
                                Regenerate
                              </button>
                            </form>
                          </div>
                        ) : (
                          <form action={setPlaybookJoinCode}>
                            <input type="hidden" name="org_id" value={params.id} />
                            <input type="hidden" name="playbook_id" value={pb.id} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 transition hover:text-blue-300"
                            >
                              <Key className="h-3 w-3" />
                              Generate join code
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/40">
                No playbooks yet.{' '}
                {isHeadCoach && (
                  <Link
                    href={`/playbooks/new?org_id=${params.id}`}
                    className="font-semibold text-blue-400 hover:underline"
                  >
                    Create one
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* Right: members */}
          <aside>
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <h2 className="text-lg font-bold text-white">Members</h2>
              <ul className="mt-4 space-y-2">
                {members?.map((m) => {
                  const profile = m.profiles as unknown as { username: string | null } | null
                  return (
                    <li key={m.user_id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-white/80">
                        {profile?.username ?? m.user_id.slice(0, 8)}
                      </span>
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-white/60">
                        {roleLabel[m.role] ?? m.role}
                      </span>
                    </li>
                  )
                })}
                {(!members || members.length === 0) && (
                  <li className="text-sm text-white/40">No members.</li>
                )}
              </ul>
              {isHeadCoach && (
                <p className="mt-4 text-xs text-white/40">
                  Share a playbook join code to add players.
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
