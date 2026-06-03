import Link from 'next/link'

type Props = {
  backHref?: string
  backLabel?: string
}

export default function AppHeader({ backHref, backLabel }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-white/10 pb-4">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-black text-white shadow-md shadow-blue-500/20 transition hover:opacity-90"
        >
          RM
        </Link>
        {backHref && backLabel && (
          <>
            <span className="text-white/20">/</span>
            <Link
              href={backHref}
              className="text-sm font-medium text-white/50 transition-colors hover:text-white"
            >
              {backLabel}
            </Link>
          </>
        )}
      </div>
      <Link
        href="/account"
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        Account
      </Link>
    </header>
  )
}
