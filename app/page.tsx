import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import HomeDashboard from '@/components/home/HomeDashboard'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const [{ data: rawPlays }, { data: rawPlaybooks }, { data: rawOrgs }] = await Promise.all([
      supabase
        .from('plays')
        .select('id, title, category, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(30),
      supabase
        .from('playbooks')
        .select('id, name')
        .eq('owner_id', user.id)
        .order('name')
        .limit(20),
      supabase
        .from('org_members')
        .select('role, organisations(id, name)')
        .eq('user_id', user.id)
        .order('joined_at')
        .limit(10),
    ])
    const cloudPlays = (rawPlays ?? []) as Array<{
      id: string; title: string; category: string; updated_at: string
    }>
    const cloudPlaybooks = (rawPlaybooks ?? []) as Array<{ id: string; name: string }>
    const cloudOrgs = (rawOrgs ?? []).map((m) => {
      const org = m.organisations as unknown as { id: string; name: string } | null
      return org ? { id: org.id, name: org.name, role: m.role } : null
    }).filter((o): o is { id: string; name: string; role: string } => o !== null)
    return <HomeDashboard cloudPlays={cloudPlays} cloudPlaybooks={cloudPlaybooks} cloudOrgs={cloudOrgs} />
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-4 py-12 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30">
            <span className="text-2xl font-black text-white">RM</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">RugbyMove</h1>
          <p className="mt-3 text-lg font-black tracking-tight text-white">
            Build tactics.{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Coach smarter.
            </span>
          </p>
          <p className="mt-2 text-sm text-white/60">
            Build tactics. Share playbooks. Coach smarter.
          </p>
        </div>

        {/* Auth options */}
        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            Create account
          </Link>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-black px-3 text-xs text-white/40">or</span>
          </div>
        </div>

        <Link
          href="/playbook/new"
          className="flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
        >
          Continue as guest
        </Link>

        <p className="mt-4 text-center text-xs text-white/40">
          Guest mode lets you build and play moves, but saving to a playbook requires an account.
        </p>
      </div>
    </main>
  )
}
