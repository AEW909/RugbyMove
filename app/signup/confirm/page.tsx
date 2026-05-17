import Link from 'next/link'
import { MailCheck } from 'lucide-react'

type ConfirmPageProps = {
  searchParams: { email?: string }
}

export default function SignUpConfirmPage({ searchParams }: ConfirmPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7faf8] px-4 py-10 text-slate-950">
      <section className="w-full max-w-md rounded-lg border border-emerald-900/10 bg-white p-8 shadow-toolbar text-center">
        <MailCheck className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-4 text-2xl font-bold">Check your email</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          We&apos;ve sent a confirmation link to{' '}
          {searchParams.email ? (
            <span className="font-semibold text-slate-950">{searchParams.email}</span>
          ) : (
            'your email address'
          )}
          . Click the link to activate your account.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          The link will expire after 24 hours. Check your spam folder if it doesn&apos;t arrive
          within a few minutes.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-md bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Back to log in
        </Link>
      </section>
    </main>
  )
}
