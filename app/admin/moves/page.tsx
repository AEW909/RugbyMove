import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Play } from '@/types/play'

export default async function AdminMovesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_master')
    .eq('id', user.id)
    .single()

  if (!profile?.is_master) {
    redirect('/account')
  }

  const { data: plays, error } = await supabase
    .from('plays')
    .select('id,title,description,category,is_public,updated_at,user_id,animation_data,profiles(username,team_name)')
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const normalizedPlays = ((plays ?? []) as unknown as Array<
    Omit<Play, 'profiles'> & {
      profiles:
        | {
            username: string | null
            team_name: string | null
          }
        | {
            username: string | null
            team_name: string | null
          }[]
        | null
    }
  >).map((play) => ({
    ...play,
    profiles: Array.isArray(play.profiles) ? (play.profiles[0] ?? null) : play.profiles,
  }))

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-end justify-between border-b border-emerald-900/10 pb-5">
          <div>
            <h1 className="text-3xl font-bold">All saved moves</h1>
            <p className="mt-2 text-sm text-slate-600">Master-user view across all accounts.</p>
          </div>
          <Link href="/account" className="text-sm font-semibold text-emerald-700">
            Account
          </Link>
        </header>

        <div className="mt-6 grid gap-3">
          {normalizedPlays.length ? (
            normalizedPlays.map((play) => (
              <Link
                href={`/playbook/${play.id}`}
                key={play.id}
                className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-700"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-semibold">{play.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {play.profiles?.team_name ?? play.profiles?.username ?? play.user_id}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-slate-500">{play.category}</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              No saved moves yet.
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
