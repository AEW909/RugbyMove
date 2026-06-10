import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type EmptyStateProps = {
  /** Pass the lucide icon component itself, e.g. icon={BookOpen}. */
  icon?: ComponentType<{ className?: string }>
  title: ReactNode
  description?: ReactNode
  /** Call-to-action, usually a Link styled with buttonVariants(). */
  action?: ReactNode
  className?: string
}

/**
 * Placeholder for lists with no content yet. Always pair a "nothing here"
 * message with the way out — what the user can do about it.
 *
 *   <EmptyState
 *     icon={BookOpen}
 *     title="No moves yet"
 *     description="Create your first move to start building this playbook."
 *     action={<Link href="/playbook/new" className={buttonVariants()}>New move</Link>}
 *   />
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center',
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="h-8 w-8 text-white/20" />}
      <p className="font-semibold text-white/80">{title}</p>
      {description && <p className="max-w-sm text-sm text-white/40">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
