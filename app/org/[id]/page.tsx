import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BookOpen, Globe, Lock, Plus, Trash2, UserMinus, Users } from 'lucide-react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  assignCoachToPlaybook,
  createOrgPlaybook,
  generatePlaybookJoinCode,
  removeOrgMember,
  updateOrgMemberRole,
} from '@/app/actions/orgs'
import type { OrgRole } from '@/types/play'

type PageProps = {
  params: { id: string }
  searchParams: { message?: string; error?: string }
}

const roleLabel: Record<OrgRole, string> = {
  head_coach: 'Head Coach',
  coach: 'Coach',
  player: 'Player',
}

const visibilityIcon = { private: Lock, team: Users, public: Globe }

export default async function OrgPage({ params, searchParams }: PageProps) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load org
  const { data: org } = await admin
    .from('organisations')
    .select('*')
    .eq('id', params.id)
    .single()
  if (!org) notFound()

  // Check current user's membership
  const { data: myMembership } = await admin
    .from('org_members')
    .select('role')
    .eq('org_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!myMembership) notFound()

  const myRole = myMembership.role as OrgRole
  const isHeadCoach = myRole === 'head_coach'
  const isCoach = myRole === 'coach' || isHeadCoach

  // Load all org members with profiles
  const { data: members } = await admin
    .from('org_members')
    .select('user_id, role, joined_at, profiles(username, display_name)')
    .eq('org_id', params.id)
    .order('joined_at')

  // Load org playbooks (all if head coach, assigned only if coach/player)
  const playbooksQuery = admin
    .from('playbooks')
    .select('id, name, description, visibility, join_code')
    .eq('org_id', params.id)
    .order('name')

  const { data: allOrgPlaybooks } = await playbooksQuery

  // For coaches/players: filter to only playbooks they're assigned to
  let visiblePlaybooks = allOrgPlaybooks ?? []
  if (!isHeadCoach) {
    const { data: myPlaybookMemberships } = await admin
      .from('playbook_members')
      .select('playbook_id')
      .eq('user_id', user.id)
    const myPlaybookIds = new Set((myPlaybookMemberships ?? []).map((m) => m.playbook_id))
    visiblePlaybooks = visiblePlaybooks.filter((pb) => myPlaybookIds.has(pb.id))
  }

  // For assigning coaches: load coaches in the org
  const coachMembers = (members ?? []).filter(
    (m) => m.role === 'coach' || m.role === 'head_coach',
  )

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-8 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-medium text-white/40 transition-colors hover:text-white">
          ← Home
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">{org.name}</h1>
            {org.description && (
              <p className="mt-1 text-sm text-white/50">{org.description}</p>
            )}
            <span className="mt-2 inline-block rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-white/50">
              {roleLabel[myRole]}
            </span>
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

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* Left: Playbooks */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-white">Playbooks</h2>
                {isCoach && (
                  <form action={createOrgPlaybook} className="flex items-center gap-2">
                    <input type="hidden" name="org_id" value={params.id} />
                    <input
                      name="name"
                      type="text"
                      required
                      maxLength={120}
                      placeholder="New playbook name…"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-1.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create
                    </button>
                  </form>
                )}
              </div>

              {visiblePlaybooks.length === 0 ? (
                <p className="mt-4 text-sm text-white/40">
                  {isCoach ? 'Create a playbook to get started.' : 'No playbooks assigned yet.'}
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {visiblePlaybooks.map((pb) => {
                    const Icon = visibilityIcon[pb.visibility as keyof typeof visibilityIcon] ?? Lock
                    return (
                      <li
                        key={pb.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/playbooks/${pb.id}`}
                            className="flex items-center gap-2 font-semibold text-white transition hover:text-blue-400"
                          >
                            <BookOpen className="h-4 w-4 shrink-0 text-blue-400" />
                            {pb.name}
                          </Link>
                          {pb.description && (
                            <p className="mt-0.5 truncate text-xs text-white/40">{pb.description}</p>
                          )}
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-white/50">
                              <Icon className="h-3 w-3" />
                              {pb.visibility}
                            </span>
                            {pb.join_code && (
                              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 font-mono text-xs font-semibold tracking-wider text-blue-300">
                                {pb.join_code}
                              </span>
                            )}
                          </div>
                        </div>
                        {isCoach && (
                          <div className="flex shrink-0 flex-col gap-1">
                            <form action={generatePlaybookJoinCode}>
                              <input type="hidden" name="org_id" value={params.id} />
                              <input type="hidden" name="playbook_id" value={pb.id} />
                              <button
                                type="submit"
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-white/60 transition hover:bg-white/10"
                              >
                                {pb.join_code ? 'Regen code' : 'Gen code'}
                              </button>
                            </form>
                            {isHeadCoach && coachMembers.length > 0 && (
                              <form action={assignCoachToPlaybook} className="flex gap-1">
                                <input type="hidden" name="org_id" value={params.id} />
                                <input type="hidden" name="playbook_id" value={pb.id} />
                                <select
                                  name="user_id"
                                  required
                                  className="flex-1 rounded-lg border border-white/10 bg-zinc-800 px-2 py-1 text-xs text-white outline-none [&>option]:bg-zinc-900"
                                >
                                  <option value="">Assign coach…</option>
                                  {coachMembers.map((m) => {
                                    const profile = m.profiles as { username: string | null; display_name: string | null } | null
                                    return (
                                      <option key={m.user_id} value={m.user_id}>
                                        {profile?.display_name ?? profile?.username ?? m.user_id.slice(0, 8)}
                                      </option>
                                    )
                                  })}
                                </select>
                                <button
                                  type="submit"
                                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-white/60 transition hover:bg-white/10"
                                >
                                  Add
                                </button>
                              </form>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* Right: Members */}
          <aside>
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <h2 className="mb-4 text-lg font-bold text-white">Members</h2>

              <ul className="space-y-2">
                {(members ?? []).map((m) => {
                  const profile = m.profiles as { username: string | null; display_name: string | null } | null
                  const isMe = m.user_id === user.id
                  return (
                    <li key={m.user_id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white/80">
                          {profile?.display_name ?? profile?.username ?? m.user_id.slice(0, 8)}
                          {isMe && <span className="ml-1 text-white/30">(you)</span>}
                        </p>
                        <p className="text-xs text-white/40">{roleLabel[m.role as OrgRole]}</p>
                      </div>
                      {isHeadCoach && !isMe && (
                        <div className="flex shrink-0 items-center gap-1">
                          <form action={updateOrgMemberRole} className="flex items-center gap-1">
                            <input type="hidden" name="org_id" value={params.id} />
                            <input type="hidden" name="user_id" value={m.user_id} />
                            <select
                              name="role"
                              defaultValue={m.role}
                              className="rounded-lg border border-white/10 bg-zinc-800 px-2 py-1 text-xs text-white outline-none [&>option]:bg-zinc-900"
                            >
                              <option value="player">Player</option>
                              <option value="coach">Coach</option>
                              <option value="head_coach">Head Coach</option>
                            </select>
                            <button
                              type="submit"
                              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-white/60 transition hover:bg-white/10"
                            >
                              Set
                            </button>
                          </form>
                          <form action={removeOrgMember}>
                            <input type="hidden" name="org_id" value={params.id} />
                            <input type="hidden" name="user_id" value={m.user_id} />
                            <button
                              type="submit"
                              aria-label="Remove member"
                              className="rounded-lg p-1 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>

              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="text-xs text-white/40">
                  Players join by entering a playbook join code at{' '}
                  <Link href="/join" className="font-semibold text-blue-400 hover:underline">
                    /join
                  </Link>
                  .
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
