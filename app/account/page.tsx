import Link from 'next/link'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'

type AccountPageProps = {
  searchParams: {
    message?: string
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('username,team_name,is_master')
    .eq('id', user.id)
    .single()

  const { data: plays } = await supabase
    .from('plays')
    .select('id,title,category,is_public,updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(12)

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-slate-950 sm:px-8">
      <section className="mx-auto max-w-3xl rounded-lg border border-emerald-900/10 bg-white p-6 shadow-toolbar">
        <h1 className="text-3xl font-bold">Account</h1>
        {searchParams.message ? (
          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            {searchParams.message}
          </p>
        ) : null}

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-slate-500">Email</dt>
            <dd className="mt-1 text-slate-950">{user.email}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Team</dt>
            <dd className="mt-1 text-slate-950">{profile?.team_name ?? 'Not set'}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Role</dt>
            <dd className="mt-1 text-slate-950">{profile?.is_master ? 'Master user' : 'Coach'}</dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/account/password"
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Change password
          </Link>
          {profile?.is_master ? (
            <Link
              href="/admin/moves"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              View all saved moves
            </Link>
          ) : null}
          <form action={signOut}>
            <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
              Log out
            </button>
          </form>
        </div>

        <section className="mt-8 border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Your saved moves</h2>
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
      </section>
    </main>
  )
}
