import Image from 'next/image'
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
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-4 py-12 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand */}
        <div className="mb-10 text-center">
          <Image
            src="/logo-wordmark.png"
            alt="RugbyMove"
            width={360}
            height={120}
            className="mx-auto w-72 sm:w-80"
            priority
          />
          <p className="mt-4 text-sm text-white/60">
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
