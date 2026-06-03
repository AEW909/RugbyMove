'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { GripVertical, LayoutList, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { removePlayFromPlaybook, reorderPlaybookPlays } from '@/app/actions/playbooks'
import type { PlayCategory } from '@/types/play'

type Play = { id: string; title: string; category: string }

type Props = {
  playbookId: string
  plays: Play[]
  canManage: boolean
  availablePlays: Play[]
  activeCategory: PlayCategory | null
  categories: PlayCategory[]
  categoryLabel: Record<PlayCategory, string>
}

export default function PlaybookMovesSection({
  playbookId,
  plays: initialPlays,
  canManage,
  availablePlays: _availablePlays,
  activeCategory,
  categories,
  categoryLabel,
}: Props) {
  const [plays, setPlays] = useState<Play[]>(initialPlays)
  const [reordering, setReordering] = useState(false)
  const [, startTransition] = useTransition()

  // DnD state
  const draggingId = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, id: string) => {
    draggingId.current = id
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== draggingId.current) setDragOverId(id)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDragOverId(null)
    const fromId = draggingId.current
    draggingId.current = null
    if (!fromId || fromId === targetId) return

    setPlays((prev) => {
      const next = [...prev]
      const fromIdx = next.findIndex((p) => p.id === fromId)
      const toIdx = next.findIndex((p) => p.id === targetId)
      if (fromIdx === -1 || toIdx === -1) return prev
      const [item] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, item)
      startTransition(async () => {
        await reorderPlaybookPlays(playbookId, next.map((p) => p.id))
      })
      return next
    })
  }

  const handleDragEnd = () => {
    draggingId.current = null
    setDragOverId(null)
  }

  const visiblePlays = activeCategory
    ? plays.filter((p) => p.category === activeCategory)
    : plays

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">Moves</h2>
        {canManage && plays.length > 1 && (
          <button
            type="button"
            onClick={() => setReordering((r) => !r)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition',
              reordering
                ? 'border-white/20 bg-white/10 text-white'
                : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80',
            )}
          >
            {reordering ? (
              <>
                <X className="h-3.5 w-3.5" />
                Done
              </>
            ) : (
              <>
                <LayoutList className="h-3.5 w-3.5" />
                Organise
              </>
            )}
          </button>
        )}
      </div>

      {/* Category filter — hidden while reordering */}
      {!reordering && plays.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/playbooks/${playbookId}`}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold transition',
              !activeCategory
                ? 'border-blue-500/50 bg-blue-500/20 text-blue-300'
                : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10',
            )}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/playbooks/${playbookId}?category=${cat}`}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition',
                activeCategory === cat
                  ? 'border-blue-500/50 bg-blue-500/20 text-blue-300'
                  : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10',
              )}
            >
              {categoryLabel[cat]}
            </Link>
          ))}
        </div>
      )}

      {visiblePlays.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {visiblePlays.map((play) => (
            <li
              key={play.id}
              draggable={reordering}
              onDragStart={reordering ? (e) => handleDragStart(e, play.id) : undefined}
              onDragOver={reordering ? (e) => handleDragOver(e, play.id) : undefined}
              onDragLeave={reordering ? () => setDragOverId(null) : undefined}
              onDrop={reordering ? (e) => handleDrop(e, play.id) : undefined}
              onDragEnd={reordering ? handleDragEnd : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl border bg-white/5 p-3 transition',
                reordering && dragOverId === play.id
                  ? 'border-blue-400/60 bg-blue-500/10'
                  : 'border-white/10',
                reordering && 'cursor-grab active:cursor-grabbing',
              )}
            >
              {reordering && (
                <GripVertical className="h-4 w-4 shrink-0 text-white/30" />
              )}
              <div className="min-w-0 flex-1">
                {reordering ? (
                  <p className="truncate font-medium text-white">{play.title}</p>
                ) : (
                  <Link
                    href={`/playbook/${play.id}?from=${playbookId}`}
                    className="truncate font-medium text-white transition-colors hover:text-blue-400"
                  >
                    {play.title}
                  </Link>
                )}
                <p className="text-xs text-white/40">{play.category}</p>
              </div>
              {canManage && !reordering && (
                <form action={removePlayFromPlaybook}>
                  <input type="hidden" name="playbook_id" value={playbookId} />
                  <input type="hidden" name="play_id" value={play.id} />
                  <button
                    type="submit"
                    aria-label="Remove move"
                    className="rounded-lg p-1.5 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-white/40">
          {activeCategory ? `No ${categoryLabel[activeCategory]} moves in this playbook.` : 'No moves added yet.'}
        </p>
      )}
    </section>
  )
}
