import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, Users, User } from 'lucide-react'

export default function AppHeader() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
      <Link href="/" aria-label="Home">
        <Image src="/logo-icon.png" alt="RugbyMove" width={36} height={36} className="h-9 w-9 rounded-xl transition hover:opacity-80" />
      </Link>
      <nav className="flex items-center gap-1">
        <Link
          href="/playbooks"
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white/50 transition hover:bg-white/5 hover:text-white"
        >
          <BookOpen className="h-4 w-4" />
          Playbooks
        </Link>
        <Link
          href="/orgs"
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white/50 transition hover:bg-white/5 hover:text-white"
        >
          <Users className="h-4 w-4" />
          Orgs
        </Link>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white/50 transition hover:bg-white/5 hover:text-white"
        >
          <User className="h-4 w-4" />
          Account
        </Link>
      </nav>
    </header>
  )
}
