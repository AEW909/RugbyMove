import Link from 'next/link'
import { redirect } from 'next/navigation'
import { updatePassword } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'

type PasswordPageProps = {
  searchParams: {
    error?: string
  }
}

export default async function PasswordPage({ searchParams }: PasswordPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-10 text-white flex items-center justify-center">
      {/* BG gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 w-full max-w-md">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <h1 className="text-2xl font-black tracking-tight text-white">Change password</h1>
          {searchParams.error ? (
            <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
              {searchParams.error}
            </p>
          ) : null}
          <form className="mt-6 flex flex-col gap-4" action={updatePassword}>
            <label className="text-sm font-semibold text-white/80">
              New password
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 font-normal"
              />
            </label>
            <label className="text-sm font-semibold text-white/80">
              Confirm password
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 font-normal"
              />
            </label>
            <button className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90">
              Update password
            </button>
          </form>
          <Link href="/account" className="mt-5 inline-flex text-sm font-medium text-white/40 transition-colors hover:text-white">
            Back to account
          </Link>
        </section>
      </div>
    </main>
  )
}
