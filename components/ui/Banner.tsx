import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BannerTone = 'success' | 'error'

const TONE_CLASSES: Record<BannerTone, string> = {
  success: 'border-green-500/20 bg-green-500/10 text-green-300',
  error: 'border-red-500/20 bg-red-500/10 text-red-300',
}

type BannerProps = {
  tone: BannerTone
  children: ReactNode
  className?: string
}

/**
 * Inline feedback banner for ?message= / ?error= search params after a
 * server-action redirect. Errors use role="alert" so screen readers
 * announce them immediately; successes use the polite role="status".
 *
 *   {searchParams.message && <Banner tone="success">{searchParams.message}</Banner>}
 *   {searchParams.error && <Banner tone="error">{searchParams.error}</Banner>}
 */
export default function Banner({ tone, children, className }: BannerProps) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-xl border px-3 py-2 text-sm font-medium',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </p>
  )
}
