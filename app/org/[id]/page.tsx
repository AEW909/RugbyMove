import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BookOpen, ChevronDown, Key, Settings, Trash2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  setPlaybookJoinCode,
  addOrgMember,
  removeOrgMember,
  updateOrg,
  updateOrgMemberRole,
  setCoachInviteCode,
} from '@/app/actions/orgs'
import {
  addPlaybookMemberById,
  updatePlaybookMemberRole,
  removeMember as removePlaybookMember,
} from '@/app/actions/playbooks'
import DeleteOrgPlaybookButton from '@/components/orgs/DeleteOrgPlaybookButton'
import AppHeader from '@/components/AppHeader'

type PageProps = {
  params: { id: string }
  searchParams: { message?: string; error?: string }
}

const orgRoleLabel: Record<string, string> = {
  head_coach: 'Head Coach',
  coach: 'Coach',
  player: 'Player',
}

const pbRoleLabel: Record<string, string> = {
  editor: 'Can edit',
  viewer: 'View only',
}

export default async function OrgDetailPage({ params, searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organisations')
    .select('id, name, description, owner_id, coach_invite_code')
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

  // Fetch playbook member access for all org playbooks in one query
  const playbookIds = (playbooks ?? []).map((p) => p.id)
  const { data: allPbMembers } = playbookIds.length > 0
    ? await supabase
        .from('playbook_members')
        .select('playbook_id, user_id, role, profiles(username)')
        .in('playbook_id', playbookIds)
    : { data: [] }

  // Group playbook members by playbook_id
  const pbMembersByPlaybook = (allPbMembers ?? []).reduce<
    Record<string, { user_id: string; role: string; username: string | null }[]>
  >((acc, row) => {
    const profile = row.profiles as unknown as { username: string | null } | null
    if (!acc[row.playbook_id]) acc[row.playbook_id] = []
    acc[row.playbook_id].push({ user_id: row.user_id, role: row.role, username: profile?.username ?? null })
    return acc
  }, {})

  const returnPath = `/org/${params.id}`

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-8 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 mx-auto max-w-4xl">
        <AppHeader backHref="/orgs" backLabel="Organisations" />

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
                  {orgRoleLabel[membership.role] ?? membership.role}
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

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">

          {/* ── Left: playbooks ── */}
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
              <ul className="mt-4 space-y-4">
                {playbooks.map((pb) => {
                  const pbMembers = pbMembersByPlaybook[pb.id] ?? []
                  // Org members not yet granted access to this playbook
                  const memberUserIds = new Set(pbMembers.map((m) => m.user_id))
                  const unassigned = (members ?? []).filter(
                    (m) => !memberUserIds.has(m.user_id),
                  )

                  return (
                    <li key={pb.id} className="rounded-xl border border-white/10 bg-white/5">
                      {/* Playbook header */}
                      <div className="flex items-start justify-between gap-3 p-4">
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

                      {/* Join code row */}
                      {isHeadCoach && (
                        <div className="border-t border-white/5 px-4 py-3">
                          {pb.join_code ? (
                            <div className="flex items-center gap-2">
                              <Key className="h-3 w-3 text-white/30" />
                              <code className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs font-mono font-bold tracking-widest text-white/70">
                                {pb.join_code}
                              </code>
                              <form action={setPlaybookJoinCode}>
                                <input type="hidden" name="org_id" value={params.id} />
                                <input type="hidden" name="playbook_id" value={pb.id} />
                                <button type="submit" className="text-xs text-white/40 transition hover:text-white/70">
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

                      {/* Access management */}
                      <details className="group border-t border-white/5">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-xs font-semibold text-white/50 transition hover:text-white/80 select-none">
                          <span>
                            Access
                            {pbMembers.length > 0 && (
                              <span className="ml-1.5 text-white/30">({pbMembers.length})</span>
                            )}
                          </span>
                          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-150 group-open:rotate-180" />
                        </summary>

                        <div className="px-4 pb-4 pt-1 space-y-3">
                          {/* Current members with access */}
                          {pbMembers.length > 0 ? (
                            <ul className="space-y-1.5">
                              {pbMembers.map((m) => (
                                <li key={m.user_id} className="flex items-center gap-2">
                                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/80">
                                    {m.username ?? m.user_id.slice(0, 8)}
                                  </span>
                                  {isHeadCoach ? (
                                    <div className="flex shrink-0 items-center gap-1.5">
                                      {/* Role toggle */}
                                      <form action={updatePlaybookMemberRole}>
                                        <input type="hidden" name="playbook_id" value={pb.id} />
                                        <input type="hidden" name="user_id" value={m.user_id} />
                                        <input type="hidden" name="return_path" value={returnPath} />
                                        <input type="hidden" name="role" value={m.role === 'editor' ? 'viewer' : 'editor'} />
                                        <button
                                          type="submit"
                                          title={`Change to ${m.role === 'editor' ? 'viewer' : 'editor'}`}
                                          className={`rounded-full border px-2 py-0.5 text-xs font-semibold transition hover:opacity-80 ${
                                            m.role === 'editor'
                                              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                                              : 'border-white/10 bg-white/5 text-white/50'
                                          }`}
                                        >
                                          {pbRoleLabel[m.role] ?? m.role}
                                        </button>
                                      </form>
                                      {/* Remove from playbook */}
                                      <form action={removePlaybookMember}>
                                        <input type="hidden" name="playbook_id" value={pb.id} />
                                        <input type="hidden" name="user_id" value={m.user_id} />
                                        <button
                                          type="submit"
                                          aria-label="Remove access"
                                          className="rounded-lg p-1 text-white/20 transition hover:bg-red-500/10 hover:text-red-400"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </form>
                                    </div>
                                  ) : (
                                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                                      m.role === 'editor'
                                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                                        : 'border-white/10 bg-white/5 text-white/50'
                                    }`}>
                                      {pbRoleLabel[m.role] ?? m.role}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-white/30">No members have access yet.</p>
                          )}

                          {/* Grant access form — head coach only */}
                          {isHeadCoach && unassigned.length > 0 && (
                            <form action={addPlaybookMemberById} className="flex items-center gap-2 pt-1 border-t border-white/5">
                              <input type="hidden" name="playbook_id" value={pb.id} />
                              <input type="hidden" name="return_path" value={returnPath} />
                              <select
                                name="user_id"
                                className="flex-1 min-w-0 rounded-lg border border-white/10 bg-zinc-800 px-2 py-1.5 text-xs text-white outline-none transition focus:border-blue-400 [&>option]:bg-zinc-900"
                              >
                                {unassigned.map((m) => {
                                  const profile = m.profiles as unknown as { username: string | null } | null
                                  return (
                                    <option key={m.user_id} value={m.user_id}>
                                      {profile?.username ?? m.user_id.slice(0, 8)}
                                    </option>
                                  )
                                })}
                              </select>
                              <select
                                name="role"
                                className="shrink-0 rounded-lg border border-white/10 bg-zinc-800 px-2 py-1.5 text-xs text-white outline-none transition focus:border-blue-400 [&>option]:bg-zinc-900"
                              >
                                <option value="viewer">View only</option>
                                <option value="editor">Can edit</option>
                              </select>
                              <button
                                type="submit"
                                className="shrink-0 rounded-lg bg-blue-500/20 px-2.5 py-1.5 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/30"
                              >
                                Grant
                              </button>
                            </form>
                          )}
                        </div>
                      </details>
                    </li>
                  )
                })}
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

          {/* ── Right: members ── */}
          <aside>
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <h2 className="text-lg font-bold text-white">Members</h2>

              <ul className="mt-4 space-y-2">
                {members?.map((m) => {
                  const profile = m.profiles as unknown as { username: string | null } | null
                  const isMe = m.user_id === user.id
                  return (
                    <li key={m.user_id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-white/80">
                        {profile?.username ?? m.user_id.slice(0, 8)}
                        {isMe && <span className="ml-1.5 text-xs text-white/30">(you)</span>}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        {isHeadCoach && !isMe && m.role !== 'head_coach' ? (
                          <form action={updateOrgMemberRole}>
                            <input type="hidden" name="org_id" value={params.id} />
                            <input type="hidden" name="user_id" value={m.user_id} />
                            <input type="hidden" name="role" value={m.role === 'coach' ? 'player' : 'coach'} />
                            <button
                              type="submit"
                              title={`Change to ${m.role === 'coach' ? 'player' : 'coach'}`}
                              className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-white/60 transition hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-300"
                            >
                              {orgRoleLabel[m.role] ?? m.role}
                            </button>
                          </form>
                        ) : (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-white/60">
                            {orgRoleLabel[m.role] ?? m.role}
                          </span>
                        )}
                        {isHeadCoach && !isMe && (
                          <form action={removeOrgMember}>
                            <input type="hidden" name="org_id" value={params.id} />
                            <input type="hidden" name="user_id" value={m.user_id} />
                            <button
                              type="submit"
                              aria-label="Remove member"
                              className="rounded-lg p-1 text-white/20 transition hover:bg-red-500/10 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        )}
                      </div>
                    </li>
                  )
                })}
                {(!members || members.length === 0) && (
                  <li className="text-sm text-white/40">No members.</li>
                )}
              </ul>

              {/* Add member form */}
              {isHeadCoach && (
                <form
                  action={addOrgMember}
                  className="mt-5 space-y-3 border-t border-white/10 pt-4"
                >
                  <input type="hidden" name="org_id" value={params.id} />
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/30">
                    Add member
                  </p>
                  <div>
                    <input
                      name="username"
                      type="text"
                      required
                      placeholder="Username"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    />
                  </div>
                  <div>
                    <select
                      name="role"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400 [&>option]:bg-zinc-900"
                    >
                      <option value="coach">Coach</option>
                      <option value="player">Player</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
                  >
                    Add member
                  </button>
                </form>
              )}

              {!isHeadCoach && (
                <p className="mt-4 text-xs text-white/40">
                  Ask your head coach for a join code to add members.
                </p>
              )}
            </section>

            {/* Coach invite code */}
            {isHeadCoach && (
              <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <h2 className="text-sm font-bold text-white/80">Coach invite code</h2>
                <p className="mt-1 text-xs text-white/40">Share this code so coaches can join the organisation directly.</p>
                <div className="mt-3">
                  {(org as { coach_invite_code?: string | null }).coach_invite_code ? (
                    <div className="space-y-2">
                      <code className="block w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-center text-sm font-mono font-bold tracking-widest text-white/80">
                        {(org as { coach_invite_code?: string | null }).coach_invite_code}
                      </code>
                      <form action={setCoachInviteCode}>
                        <input type="hidden" name="org_id" value={params.id} />
                        <button type="submit" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/50 transition hover:bg-white/10">
                          Regenerate
                        </button>
                      </form>
                    </div>
                  ) : (
                    <form action={setCoachInviteCode}>
                      <input type="hidden" name="org_id" value={params.id} />
                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10"
                      >
                        <Key className="h-4 w-4" />
                        Generate coach invite code
                      </button>
                    </form>
                  )}
                </div>
              </section>
            )}

            {/* Org settings */}
            {isHeadCoach && (
              <details className="group mt-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 select-none">
                  <span className="flex items-center gap-2 text-sm font-bold text-white/80">
                    <Settings className="h-4 w-4" />
                    Settings
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="px-5 pb-5">
                  <form action={updateOrg} className="space-y-4">
                    <input type="hidden" name="org_id" value={params.id} />
                    <div>
                      <label htmlFor="org-name" className="block text-xs font-semibold text-white/60">Name</label>
                      <input
                        id="org-name"
                        name="name"
                        type="text"
                        required
                        maxLength={120}
                        defaultValue={org.name}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                      />
                    </div>
                    <div>
                      <label htmlFor="org-desc" className="block text-xs font-semibold text-white/60">
                        Description <span className="font-normal text-white/30">(optional)</span>
                      </label>
                      <textarea
                        id="org-desc"
                        name="description"
                        rows={2}
                        maxLength={2000}
                        defaultValue={org.description ?? ''}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
                    >
                      Save
                    </button>
                  </form>
                </div>
              </details>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}
