import Link from 'next/link'
import { MailCheck } from 'lucide-react'

type ConfirmPageProps = {
  searchParams: { email?: string }
}

export default function SignUpConfirmPage({ searchParams }: ConfirmPageProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <section className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30">
            <span className="text-xl font-black text-white">RM</span>
          </div>

          <MailCheck className="mx-auto h-12 w-12 text-blue-400" />

          <h1 className="mt-4 text-2xl font-black tracking-tight text-white">Check your email</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            We&apos;ve sent a confirmation link to{' '}
            {searchParams.email ? (
              <span className="font-semibold text-white">{searchParams.email}</span>
            ) : (
              'your email address'
            )}
            . Click the link to activate your account.
          </p>
          <p className="mt-2 text-sm text-white/40">
            The link will expire after 24 hours. Check your spam folder if it doesn&apos;t arrive
            within a few minutes.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
          >
            Back to log in
          </Link>
        </section>
      </div>
    </main>
  )
}
