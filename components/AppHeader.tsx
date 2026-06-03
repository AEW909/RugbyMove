import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type Props = {
  backHref?: string
  backLabel?: string
}

export default async function AppHeader({ backHref, backLabel }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let displayName: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .single()
    displayName = profile?.display_name ?? profile?.username ?? user.email?.split('@')[0] ?? null
  }

  return (
    <header className="flex items-center justify-between border-b border-white/10 pb-4">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 transition hover:opacity-80">
          <Image src="/logo-icon.png" alt="RugbyMove" width={32} height={32} className="rounded-lg" />
          <Image src="/logo-text.png" alt="" width={96} height={24} className="hidden sm:block" />
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
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        {displayName && (
          <span className="max-w-[120px] truncate text-white/80">{displayName}</span>
        )}
        <span>{displayName ? '·' : ''} Account</span>
      </Link>
    </header>
  )
}
