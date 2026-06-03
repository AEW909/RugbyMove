import Link from 'next/link'
import { redirect } from 'next/navigation'
import { signOut, updateProfile } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'
import type { PlayCategory } from '@/types/play'
import AppHeader from '@/components/AppHeader'

const CATEGORIES: PlayCategory[] = ['Attacking', 'Defending', 'SetPiece']
const CATEGORY_LABEL: Record<PlayCategory, string> = {
  Attacking: 'Attacking',
  Defending: 'Defending',
  SetPiece: 'Set Piece',
}

type AccountPageProps = {
  searchParams: {
    message?: string
    error?: string
    category?: string
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

  const activeCategory = CATEGORIES.includes(searchParams.category as PlayCategory)
    ? (searchParams.category as PlayCategory)
    : null

  const playsQuery = supabase
    .from('plays')
    .select('id,title,category,is_public,updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(60)

  if (activeCategory) playsQuery.eq('category', activeCategory)

  const [{ data: profile }, { data: plays }] = await Promise.all([
    supabase
      .from('profiles')
      .select('username,display_name')
      .eq('id', user.id)
      .single(),
    playsQuery,
  ])

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-8 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-6">
        <AppHeader backHref="/" backLabel="Home" />
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

          <form action={updateProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-white/80">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                maxLength={30}
                defaultValue={profile?.username ?? ''}
                placeholder="e.g. coach_jones"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="display_name" className="block text-sm font-semibold text-white/80">
                Display name
              </label>
              <input
                id="display_name"
                name="display_name"
                type="text"
                required
                maxLength={60}
                defaultValue={profile?.display_name ?? ''}
                placeholder="e.g. Andy Wilkinson"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
              >
                Save profile
              </button>
              <Link
                href="/account/password"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                Change password
              </Link>
              <Link
                href="/playbooks"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                My playbooks
              </Link>
            </div>
          </form>
        </section>

        {/* Saved moves */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">Saved moves</h2>
            <Link
              href="/playbook/new"
              className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
            >
              New move
            </Link>
          </div>

          {/* Category filter */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/account"
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                !activeCategory
                  ? 'border-blue-500/50 bg-blue-500/20 text-blue-300'
                  : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              All
            </Link>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/account?category=${cat}`}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  activeCategory === cat
                    ? 'border-blue-500/50 bg-blue-500/20 text-blue-300'
                    : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {CATEGORY_LABEL[cat]}
              </Link>
            ))}
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
                    </div>
                    <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-300 border border-blue-500/20">
                      {play.category}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/40">
                {activeCategory
                  ? `No ${CATEGORY_LABEL[activeCategory]} moves saved yet.`
                  : 'No saved moves in your account yet.'}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
