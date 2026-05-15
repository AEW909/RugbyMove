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
    <main className="flex min-h-screen items-center justify-center bg-[#f7faf8] px-4 py-10 text-slate-950">
      <section className="w-full max-w-md rounded-lg border border-emerald-900/10 bg-white p-6 shadow-toolbar">
        <h1 className="text-2xl font-bold">Change password</h1>
        {searchParams.error ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {searchParams.error}
          </p>
        ) : null}
        <form className="mt-6 flex flex-col gap-4" action={updatePassword}>
          <label className="text-sm font-semibold">
            New password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-normal outline-none transition focus:border-emerald-700"
            />
          </label>
          <label className="text-sm font-semibold">
            Confirm password
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-normal outline-none transition focus:border-emerald-700"
            />
          </label>
          <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
            Update password
          </button>
        </form>
        <Link href="/account" className="mt-5 inline-flex text-sm font-medium text-emerald-700">
          Back to account
        </Link>
      </section>
    </main>
  )
}
