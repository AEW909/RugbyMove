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
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-3xl flex flex-col gap-6">
        {/* Header */}
        <section className="rounded-lg border border-emerald-900/10 bg-white p-6 shadow-toolbar">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Account</h1>
              <p className="mt-1 text-sm text-slate-500">{user.email}</p>
            </div>
            <form action={signOut}>
              <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                Log out
              </button>
            </form>
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

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="font-semibold text-slate-500">Role</dt>
              <dd className="mt-1">{profile?.is_master ? 'Master user' : 'Coach'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Team name</dt>
              <dd className="mt-1">{profile?.team_name ?? '—'}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/account/password"
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Change password
            </Link>
            {profile?.is_master && (
              <Link
                href="/admin/moves"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                View all moves
              </Link>
            )}
          </div>
        </section>

        {/* Teams */}
        <section className="rounded-lg border border-emerald-900/10 bg-white p-6 shadow-toolbar">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Teams</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Teams group playbooks and players together. Players can be added to a team and will see assigned playbooks when the player portal launches.
          </p>

          {teams && teams.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {teams.map((team) => (
                <li key={team.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="font-medium text-slate-800">{team.name}</span>
                  {profile?.default_team_id === team.id && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      Default
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No teams yet.
            </div>
          )}

          <form action={createTeam} className="mt-4 flex gap-2">
            <input
              name="name"
              required
              placeholder="Team name"
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-700"
            />
            <button
              type="submit"
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Create
            </button>
          </form>
        </section>

        {/* Defaults */}
        <section className="rounded-lg border border-emerald-900/10 bg-white p-6 shadow-toolbar">
          <h2 className="text-lg font-semibold">Defaults</h2>
          <p className="mt-1 text-sm text-slate-500">
            Your default team and playbook are pre-selected when saving moves from the board.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <form action={setDefaultTeam} className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">
                Default team
                <select
                  name="team_id"
                  defaultValue={profile?.default_team_id ?? ''}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none transition focus:border-emerald-700"
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
                className="self-start rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Save
              </button>
            </form>

            <form action={setDefaultPlaybook} className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">
                Default playbook
                <select
                  name="playbook_id"
                  defaultValue={profile?.default_playbook_id ?? ''}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none transition focus:border-emerald-700"
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
                className="self-start rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Save
              </button>
            </form>
          </div>
        </section>

        {/* Saved moves */}
        <section className="rounded-lg border border-emerald-900/10 bg-white p-6 shadow-toolbar">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Saved moves</h2>
            <Link href="/playbook/new" className="text-sm font-semibold text-emerald-700">
              New move
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {plays?.length ? (
              plays.map((play) => (
                <Link
                  href={`/playbook/${play.id}`}
                  key={play.id}
                  className="rounded-md border border-slate-200 p-4 transition hover:border-emerald-700"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{play.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">{play.category}</p>
                    </div>
                    <span className="text-xs font-semibold uppercase text-slate-500">
                      {play.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                No saved moves in your account yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
