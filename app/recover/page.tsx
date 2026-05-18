import Link from 'next/link'
import { requestPasswordReset } from '@/app/actions/auth'

type RecoverPageProps = {
  searchParams: {
    error?: string
    message?: string
  }
}

export default function RecoverPage({ searchParams }: RecoverPageProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <section className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30">
            <span className="text-xl font-black text-white">RM</span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white">Recover password</h1>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Send a secure reset link to your email address.
          </p>

          {searchParams.error ? (
            <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
              {searchParams.error}
            </p>
          ) : null}
          {searchParams.message ? (
            <p className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-300">
              {searchParams.message}
            </p>
          ) : null}

          <form className="mt-6 flex flex-col gap-4" action={requestPasswordReset}>
            <label className="text-sm font-semibold text-white/80">
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-normal text-white placeholder:text-white/30 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
              />
            </label>
            <button className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90">
              Send reset link
            </button>
          </form>

          <Link
            href="/login"
            className="mt-5 inline-flex text-sm font-medium text-white/50 transition-colors hover:text-white"
          >
            Return to login
          </Link>
        </section>
      </div>
    </main>
  )
}
