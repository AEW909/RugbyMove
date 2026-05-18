import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BookOpen, Globe, Lock, Trash2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  addMember,
  addPlayToPlaybook,
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
  { value: 'team', label: 'Team', desc: 'Members you invite', Icon: Users },
  { value: 'public', label: 'Public', desc: 'Anyone with the link', Icon: Globe },
] as const

export default async function PlaybookDetailPage({ params, searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: playbook } = await supabase
    .from('playbooks')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!playbook) notFound()

  const isOwner = playbook.owner_id === user.id

  const { data: members } = await supabase
    .from('playbook_members')
    .select('id, user_id, role, profiles(username)')
    .eq('playbook_id', params.id)
    .order('created_at')

  const currentMember = members?.find((m) => m.user_id === user.id)
  const canManage = isOwner || currentMember?.role === 'coach'

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
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/playbooks" className="text-sm font-medium text-slate-500 hover:text-slate-800">
          ← Playbooks
        </Link>

        <div className="mt-4 flex items-start gap-3">
          <BookOpen className="mt-1 h-7 w-7 shrink-0 text-emerald-700" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{playbook.name}</h1>
            {playbook.description && (
              <p className="mt-1 text-sm text-slate-600">{playbook.description}</p>
            )}
          </div>
        </div>

        {searchParams.message && (
          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            {searchParams.message}
          </p>
        )}
        {searchParams.error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {searchParams.error}
          </p>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Left column: plays */}
          <div className="space-y-6">
            <section className="rounded-lg border border-emerald-900/10 bg-white p-5">
              <h2 className="text-lg font-semibold">Moves</h2>

              {playbookPlaysRows && playbookPlaysRows.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {playbookPlaysRows.map((row) => {
                    const play = row.plays as unknown as {
                      id: string
                      title: string
                      category: string
                    } | null
                    if (!play) return null
                    return (
                      <li
                        key={row.play_id}
                        className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/playbook/${play.id}`}
                            className="truncate font-medium hover:text-emerald-700"
                          >
                            {play.title}
                          </Link>
                          <p className="text-xs text-slate-400">{play.category}</p>
                        </div>
                        {canManage && (
                          <form action={removePlayFromPlaybook}>
                            <input type="hidden" name="playbook_id" value={params.id} />
                            <input type="hidden" name="play_id" value={play.id} />
                            <button
                              type="submit"
                              aria-label="Remove move"
                              className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </form>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-slate-400">No moves added yet.</p>
              )}

              {canManage && availablePlays.length > 0 && (
                <form action={addPlayToPlaybook} className="mt-4 flex gap-2">
                  <input type="hidden" name="playbook_id" value={params.id} />
                  <select
                    name="play_id"
                    required
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
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
                    className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Add
                  </button>
                </form>
              )}

              {canManage && availablePlays.length === 0 && playbookPlaysRows?.length === 0 && (
                <p className="mt-3 text-sm text-slate-400">
                  Save moves from the board first, then add them here.
                </p>
              )}

              {canManage && availablePlays.length === 0 && (playbookPlaysRows?.length ?? 0) > 0 && (
                <p className="mt-3 text-sm text-slate-400">All your saved moves are in this playbook.</p>
              )}
            </section>

            {/* Edit playbook settings (owner only) */}
            {isOwner && (
              <section className="rounded-lg border border-emerald-900/10 bg-white p-5">
                <h2 className="text-lg font-semibold">Settings</h2>
                <form action={updatePlaybook} className="mt-4 space-y-4">
                  <input type="hidden" name="id" value={params.id} />

                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-slate-700">
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      maxLength={120}
                      defaultValue={playbook.name}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-semibold text-slate-700">
                      Description{' '}
                      <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={2}
                      maxLength={2000}
                      defaultValue={playbook.description ?? ''}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>

                  <fieldset>
                    <legend className="block text-sm font-semibold text-slate-700">
                      Visibility
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      {visibilityOptions.map(({ value, label, desc, Icon }) => (
                        <label
                          key={value}
                          className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm transition has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50"
                        >
                          <input
                            type="radio"
                            name="visibility"
                            value={value}
                            defaultChecked={playbook.visibility === value}
                            className="mt-0.5 accent-emerald-600"
                          />
                          <span>
                            <span className="flex items-center gap-1 font-semibold">
                              <Icon className="h-3 w-3" />
                              {label}
                            </span>
                            <span className="block text-slate-500">{desc}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
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
            <section className="rounded-lg border border-emerald-900/10 bg-white p-5">
              <h2 className="text-lg font-semibold">Members</h2>

              <ul className="mt-4 space-y-2">
                {/* Owner row */}
                <li className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{isOwner ? 'You' : '(owner)'}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                    owner
                  </span>
                </li>

                {members?.map((m) => {
                  const profile = m.profiles as unknown as { username: string | null } | null
                  return (
                    <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">
                        {profile?.username ?? m.user_id.slice(0, 8)}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {m.role}
                        </span>
                        {canManage && (
                          <form action={removeMember}>
                            <input type="hidden" name="playbook_id" value={params.id} />
                            <input type="hidden" name="user_id" value={m.user_id} />
                            <button
                              type="submit"
                              aria-label="Remove member"
                              className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
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
                  <li className="text-sm text-slate-400">No members yet.</li>
                )}
              </ul>

              {canManage && (
                <form action={addMember} className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                  <input type="hidden" name="playbook_id" value={params.id} />
                  <div>
                    <label
                      htmlFor="username"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Add by username
                    </label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      placeholder="e.g. coach_jones"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label htmlFor="role" className="block text-sm font-semibold text-slate-700">
                      Role
                    </label>
                    <select
                      id="role"
                      name="role"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    >
                      <option value="player">Player (view only)</option>
                      <option value="coach">Coach (can edit)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
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
