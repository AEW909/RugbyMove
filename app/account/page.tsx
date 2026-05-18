import Link from 'next/link'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/actions/auth'
import { createTeam, setDefaultPlaybook, setDefaultTeam } from '@/app/actions/teams'
import { createClient } from '@/lib/supabase/server'

type AccountPageProps = {
  searchParams: {
    message?: string
    error?: string
  }
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: profile }, { data: plays }, { data: teams }, { data: playbooks }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('username,team_name,is_master,default_team_id,default_playbook_id')
        .eq('id', user.id)
        .single(),
      supabase
        .from('plays')
        .select('id,title,category,is_public,updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(12),
      supabase
        .from('teams')
        .select('id,name')
        .eq('owner_id', user.id)
        .order('name'),
      supabase
        .from('playbooks')
        .select('id,name')
        .eq('owner_id', user.id)
        .order('name'),
    ])

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-8 text-white sm:px-8">
      {/* BG gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-6">
        {/* Header */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Account</h1>
              <p className="mt-1 text-sm text-white/60">{user.email}</p>
            </div>
            <form action={signOut}>
              <button className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20">
                Log out
              </button>
            </form>
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

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="font-semibold text-white/80">Role</dt>
              <dd className="mt-1 text-white/60">{profile?.is_master ? 'Master user' : 'Coach'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-white/80">Team name</dt>
              <dd className="mt-1 text-white/60">{profile?.team_name ?? '—'}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/account/password"
              className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
            >
              Change password
            </Link>
            {profile?.is_master && (
              <Link
                href="/admin/moves"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                View all moves
              </Link>
            )}
          </div>
        </section>

        {/* Teams */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">Teams</h2>
          </div>
          <p className="mt-1 text-sm text-white/50">
            Teams group playbooks and players together. Players can be added to a team and will see assigned playbooks when the player portal launches.
          </p>

          {teams && teams.length > 0 ? (
            <ul className="mt-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
              {teams.map((team) => (
                <li key={team.id} className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 last:border-0 text-sm">
                  <span className="font-medium text-white">{team.name}</span>
                  {profile?.default_team_id === team.id && (
                    <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-300 border border-blue-500/20">
                      Default
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/40">
              No teams yet.
            </div>
          )}

          <form action={createTeam} className="mt-4 flex gap-2">
            <input
              name="name"
              required
              placeholder="Team name"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
            />
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
            >
              Create
            </button>
          </form>
        </section>

        {/* Defaults */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-white">Defaults</h2>
          <p className="mt-1 text-sm text-white/50">
            Your default team and playbook are pre-selected when saving moves from the board.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <form action={setDefaultTeam} className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-white/80">
                Default team
                <select
                  name="team_id"
                  defaultValue={profile?.default_team_id ?? ''}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white [&>option]:bg-zinc-900 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 font-normal"
                >
                  <option value="">None</option>
                  {teams?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="self-start rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                Save
              </button>
            </form>

            <form action={setDefaultPlaybook} className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-white/80">
                Default playbook
                <select
                  name="playbook_id"
                  defaultValue={profile?.default_playbook_id ?? ''}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white [&>option]:bg-zinc-900 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 font-normal"
                >
                  <option value="">None</option>
                  {playbooks?.map((pb) => (
                    <option key={pb.id} value={pb.id}>
                      {pb.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="self-start rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                Save
              </button>
            </form>
          </div>
        </section>

        {/* Saved moves */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">Saved moves</h2>
            <Link href="/playbook/new" className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90">
              New move
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {plays?.length ? (
              plays.map((play) => (
                <Link
                  href={`/playbook/${play.id}`}
                  key={play.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white">{play.title}</h3>
                      <p className="mt-1 text-sm text-white/60">{play.category}</p>
                    </div>
                    <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-300 border border-blue-500/20">
                      {play.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/40">
                No saved moves in your account yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
