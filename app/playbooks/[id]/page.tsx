import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BookOpen, ChevronDown, ChevronUp, Globe, Lock, Users, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import AppHeader from '@/components/AppHeader'
import {
  addMember,
  addPlayToPlaybook,
  movePlayInPlaybook,
  removeMember,
  removePlayFromPlaybook,
  updatePlaybook,
} from '@/app/actions/playbooks'
import DeletePlaybookButton from '@/components/playbooks/DeletePlaybookButton'

type PageProps = {
  params: { id: string }
  searchParams: { message?: string; error?: string }
}

const visibilityOptions = [
  { value: 'private', label: 'Private', desc: 'Only you', Icon: Lock },
  { value: 'team',    label: 'Team',    desc: 'Members you invite', Icon: Users },
  { value: 'public',  label: 'Public',  desc: 'Anyone with the link', Icon: Globe },
] as const

export default async function PlaybookDetailPage({ params, searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: playbook } = await supabase
    .from('playbooks')
    .select('*, organisations(id, name)')
    .eq('id', params.id)
    .single()

  if (!playbook) notFound()

  const isOwner = playbook.owner_id === user.id

  const { data: members } = await supabase
    .from('playbook_members')
    .select('id, user_id, role, profiles(username)')
    .eq('playbook_id', params.id)
    .order('joined_at')

  const currentMember = members?.find((m) => m.user_id === user.id)
  const canManage = isOwner || currentMember?.role === 'editor'

  const { data: playbookPlaysRows } = await supabase
    .from('playbook_plays')
    .select('play_id, sort_order, plays(id, title, category)')
    .eq('playbook_id', params.id)
    .order('sort_order')

  const playbookPlayIds = new Set((playbookPlaysRows ?? []).map((r) => r.play_id))

  const { data: allUserPlays } = canManage
    ? await supabase
        .from('plays')
        .select('id, title, category')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
    : { data: [] }

  const availablePlays = (allUserPlays ?? []).filter((p) => !playbookPlayIds.has(p.id))

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-8 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 mx-auto max-w-4xl">
        <AppHeader />
        {playbook.org_id && (
          <Link
            href={`/org/${playbook.org_id}`}
            className="mb-4 inline-block text-sm font-medium text-white/40 transition-colors hover:text-white"
          >
            ← {(playbook.organisations as { id: string; name: string } | null)?.name ?? 'Organisation'}
          </Link>
        )}

        <div className="flex items-start gap-3">
          <BookOpen className="mt-1 h-7 w-7 shrink-0 text-blue-400" />
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">{playbook.name}</h1>
            {playbook.description && (
              <p className="mt-1 text-sm text-white/60">{playbook.description}</p>
            )}
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

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Left column: plays */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <h2 className="text-lg font-bold text-white">Moves</h2>

              {playbookPlaysRows && playbookPlaysRows.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {playbookPlaysRows.map((row, idx) => {
                    const play = row.plays as unknown as {
                      id: string
                      title: string
                      category: string
                    } | null
                    if (!play) return null
                    const total = playbookPlaysRows.length
                    return (
                      <li
                        key={row.play_id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/playbook/${play.id}`}
                            className="truncate font-medium text-white transition-colors hover:text-blue-400"
                          >
                            {play.title}
                          </Link>
                          <p className="text-xs text-white/40">{play.category}</p>
                        </div>
                        {canManage && (
                          <div className="flex shrink-0 items-center gap-1">
                            <form action={movePlayInPlaybook}>
                              <input type="hidden" name="playbook_id" value={params.id} />
                              <input type="hidden" name="play_id" value={play.id} />
                              <input type="hidden" name="direction" value="up" />
                              <button
                                type="submit"
                                disabled={idx === 0}
                                aria-label="Move up"
                                className="rounded-lg p-1.5 text-white/30 transition hover:bg-white/10 hover:text-white disabled:opacity-20"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>
                            </form>
                            <form action={movePlayInPlaybook}>
                              <input type="hidden" name="playbook_id" value={params.id} />
                              <input type="hidden" name="play_id" value={play.id} />
                              <input type="hidden" name="direction" value="down" />
                              <button
                                type="submit"
                                disabled={idx === total - 1}
                                aria-label="Move down"
                                className="rounded-lg p-1.5 text-white/30 transition hover:bg-white/10 hover:text-white disabled:opacity-20"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                            </form>
                            <form action={removePlayFromPlaybook}>
                              <input type="hidden" name="playbook_id" value={params.id} />
                              <input type="hidden" name="play_id" value={play.id} />
                              <button
                                type="submit"
                                aria-label="Remove move"
                                className="rounded-lg p-1.5 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </form>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-white/40">No moves added yet.</p>
              )}

              {canManage && availablePlays.length > 0 && (
                <form action={addPlayToPlaybook} className="mt-4 flex gap-2">
                  <input type="hidden" name="playbook_id" value={params.id} />
                  <select
                    name="play_id"
                    required
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 [&>option]:bg-zinc-900"
                  >
                    <option value="">Select a move…</option>
                    {availablePlays.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.category})
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
                  >
                    Add
                  </button>
                </form>
              )}

              {canManage && availablePlays.length === 0 && playbookPlaysRows?.length === 0 && (
                <p className="mt-3 text-sm text-white/40">
                  Save moves from the board first, then add them here.
                </p>
              )}

              {canManage && availablePlays.length === 0 && (playbookPlaysRows?.length ?? 0) > 0 && (
                <p className="mt-3 text-sm text-white/40">All your saved moves are in this playbook.</p>
              )}
            </section>

            {/* Edit playbook settings (owner only) */}
            {isOwner && (
              <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <h2 className="text-lg font-bold text-white">Settings</h2>
                <form action={updatePlaybook} className="mt-4 space-y-4">
                  <input type="hidden" name="id" value={params.id} />

                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-white/80">
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      maxLength={120}
                      defaultValue={playbook.name}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-semibold text-white/80">
                      Description{' '}
                      <span className="font-normal text-white/30">(optional)</span>
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={2}
                      maxLength={2000}
                      defaultValue={playbook.description ?? ''}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    />
                  </div>

                  <fieldset>
                    <legend className="block text-sm font-semibold text-white/80">
                      Visibility
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      {visibilityOptions.map(({ value, label, desc, Icon }) => (
                        <label
                          key={value}
                          className="flex cursor-pointer items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm backdrop-blur-sm transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-500/10"
                        >
                          <input
                            type="radio"
                            name="visibility"
                            value={value}
                            defaultChecked={playbook.visibility === value}
                            className="mt-0.5 accent-blue-500"
                          />
                          <span>
                            <span className="flex items-center gap-1 font-semibold text-white">
                              <Icon className="h-3 w-3" />
                              {label}
                            </span>
                            <span className="block text-white/40">{desc}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
                    >
                      Save
                    </button>
                    <DeletePlaybookButton
                      playbookId={params.id}
                      playbookName={playbook.name}
                    />
                  </div>
                </form>
              </section>
            )}
          </div>

          {/* Right column: members */}
          <aside className="space-y-4">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <h2 className="text-lg font-bold text-white">Members</h2>

              <ul className="mt-4 space-y-2">
                <li className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-white">{isOwner ? 'You' : '(owner)'}</span>
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-300">
                    owner
                  </span>
                </li>

                {members?.map((m) => {
                  const profile = m.profiles as unknown as { username: string | null } | null
                  return (
                    <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-white/80">
                        {profile?.username ?? m.user_id.slice(0, 8)}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-white/60">
                          {m.role}
                        </span>
                        {canManage && (
                          <form action={removeMember}>
                            <input type="hidden" name="playbook_id" value={params.id} />
                            <input type="hidden" name="user_id" value={m.user_id} />
                            <button
                              type="submit"
                              aria-label="Remove member"
                              className="rounded-lg p-1 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
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
                  <li className="text-sm text-white/40">No members yet.</li>
                )}
              </ul>

              {canManage && (
                <form action={addMember} className="mt-5 space-y-3 border-t border-white/10 pt-4">
                  <input type="hidden" name="playbook_id" value={params.id} />
                  <div>
                    <label htmlFor="username" className="block text-sm font-semibold text-white/80">
                      Add by username
                    </label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      placeholder="e.g. coach_jones"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                    />
                  </div>
                  <div>
                    <label htmlFor="role" className="block text-sm font-semibold text-white/80">
                      Role
                    </label>
                    <select
                      id="role"
                      name="role"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 [&>option]:bg-zinc-900"
                    >
                      <option value="viewer">Player (view only)</option>
                      <option value="editor">Coach (can edit)</option>
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
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
