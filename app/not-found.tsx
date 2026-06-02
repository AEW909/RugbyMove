import Image from 'next/image'
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-4 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_40%)]" />

      <div className="relative z-10 text-center">
        <Image src="/logo-icon.png" alt="RugbyMove" width={56} height={56} className="mx-auto mb-6 h-14 w-14 rounded-2xl opacity-60" />
        <p className="text-6xl font-black text-white/10">404</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-white">Page not found</h1>
        <p className="mt-2 text-sm text-white/50">
          That page doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90"
          >
            Go home
          </Link>
          <Link
            href="/playbooks"
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            My playbooks
          </Link>
        </div>
      </div>
    </main>
  )
}
