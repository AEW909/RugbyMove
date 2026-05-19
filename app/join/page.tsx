import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { joinViaCode } from '@/app/actions/orgs'

type PageProps = {
  searchParams: { error?: string }
}

export default async function JoinPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/join')

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-8 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 mx-auto max-w-sm">
        <Link href="/" className="text-sm font-medium text-white/40 transition-colors hover:text-white">
          ← Home
        </Link>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-white">Join a playbook</h1>
        <p className="mt-1 text-sm text-white/50">
          Enter the code your coach shared with you.
        </p>

        {searchParams.error && (
          <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
            {searchParams.error}
          </p>
        )}

        <form action={joinViaCode} className="mt-6 space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-semibold text-white/60">
              Join code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              minLength={4}
              maxLength={12}
              placeholder="e.g. ABC123"
              autoCapitalize="characters"
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm uppercase tracking-widest text-white placeholder:text-white/30 placeholder:tracking-normal outline-none backdrop-blur-sm transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
          >
            Join playbook
          </button>
        </form>
      </div>
    </main>
  )
}
