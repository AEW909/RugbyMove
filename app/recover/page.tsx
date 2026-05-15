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
    <main className="flex min-h-screen items-center justify-center bg-[#f7faf8] px-4 py-10 text-slate-950">
      <section className="w-full max-w-md rounded-lg border border-emerald-900/10 bg-white p-6 shadow-toolbar">
        <h1 className="text-2xl font-bold">Recover password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Send a secure reset link to your email address.
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

        <form className="mt-6 flex flex-col gap-4" action={requestPasswordReset}>
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
          <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
            Send reset link
          </button>
        </form>

        <Link
          href="/login"
          className="mt-5 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-900"
        >
          Return to login
        </Link>
      </section>
    </main>
  )
}
