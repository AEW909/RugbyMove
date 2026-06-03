'use client'

import Link from 'next/link'
import { useEffect } from 'react'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-4 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30">
          <span className="text-2xl font-black text-white">RM</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white">Something went wrong</h1>
        <p className="mt-3 text-sm text-white/50">
          An unexpected error occurred. Try refreshing the page.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-white/30">Error: {error.digest}</p>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
