import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type CollapsibleProps = {
  summary: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

/**
 * Collapsible panel built on native <details>/<summary> — keyboard and
 * screen-reader accessible with zero JS, so it stays a server component.
 *
 *   <Collapsible summary={<>Members <span className="text-white/40">{count}</span></>}>
 *     ...panel body...
 *   </Collapsible>
 */
export default function Collapsible({
  summary,
  children,
  defaultOpen,
  className,
}: CollapsibleProps) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        'group rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm',
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-3 px-5 py-4">
        <span className="font-bold text-white">{summary}</span>
        <ChevronDown
          aria-hidden
          className="h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  )
}
