import Link from 'next/link'
import { signIn, signUp } from '@/app/actions/auth'

type LoginPageProps = {
  searchParams: {
    error?: string
    message?: string
  }
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7faf8] px-4 py-10 text-slate-950">
      <section className="w-full max-w-md rounded-lg border border-emerald-900/10 bg-white p-6 shadow-toolbar">
        <h1 className="text-2xl font-bold">Log in to RugbyMove</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Save moves, manage formations, and keep variations in your account.
        </p>

        {searchParams.error ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {searchParams.error}
          </p>
        ) : null}
        {searchParams.message ? (
          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            {searchParams.message}
          </p>
        ) : null}

        <form className="mt-6 flex flex-col gap-4">
          <label className="text-sm font-semibold">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-normal outline-none transition focus:border-emerald-700"
            />
          </label>
          <label className="text-sm font-semibold">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-normal outline-none transition focus:border-emerald-700"
            />
          </label>

          <button
            formAction={signIn}
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Log in
          </button>
          <button
            formAction={signUp}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Create account
          </button>
        </form>

        <div className="mt-5 flex justify-between text-sm">
          <Link href="/recover" className="font-medium text-emerald-700 hover:text-emerald-900">
            Forgot password?
          </Link>
          <Link href="/" className="font-medium text-slate-500 hover:text-slate-900">
            Back home
          </Link>
        </div>
      </section>
    </main>
  )
}
