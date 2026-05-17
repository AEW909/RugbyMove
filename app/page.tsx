import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import HomeDashboard from '@/components/home/HomeDashboard'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    return <HomeDashboard />
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f7faf8] px-4 py-12 text-slate-950">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-700 shadow-lg">
            <span className="text-2xl font-black text-white">RM</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-950">RugbyMove</h1>
          <p className="mt-2 text-sm text-slate-500">
            Build tactics. Share playbooks. Coach smarter.
          </p>
        </div>

        {/* Auth options */}
        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="flex items-center justify-center rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="flex items-center justify-center rounded-lg border-2 border-slate-950 bg-transparent px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-950 hover:text-white"
          >
            Create account
          </Link>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#f7faf8] px-3 text-xs text-slate-400">or</span>
          </div>
        </div>

        <Link
          href="/playbook/new"
          className="flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Continue as guest
        </Link>

        <p className="mt-4 text-center text-xs text-slate-400">
          Guest mode lets you build and play moves, but saving to a playbook requires an account.
        </p>
      </div>
    </main>
  )
}
