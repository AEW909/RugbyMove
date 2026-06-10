import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type BadgeTone = 'blue' | 'green' | 'red' | 'purple' | 'neutral'

const TONE_CLASSES: Record<BadgeTone, string> = {
  blue: 'border-blue-500/20 bg-blue-500/20 text-blue-300',
  green: 'border-green-500/20 bg-green-500/10 text-green-300',
  red: 'border-red-500/20 bg-red-500/10 text-red-300',
  purple: 'border-purple-500/20 bg-purple-500/20 text-purple-300',
  neutral: 'border-white/10 bg-white/5 text-white/60',
}

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone
}

/** Small status pill — roles, categories, counts. */
export default function Badge({ tone = 'neutral', className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 text-xs font-semibold',
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    />
  )
}
