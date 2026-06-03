'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { GripVertical, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { syncPlaybookPlay, reorderPlaybookPlays } from '@/app/actions/playbooks'

type Play = { id: string; title: string; category: string }

type Props = {
  playbookId: string
  orderedPlays: Play[]
  availablePlays: Play[]
}

export default function PlaybookOrganiser({
  playbookId,
  orderedPlays: initial,
  availablePlays: initialAvailable,
}: Props) {
  const [plays, setPlays] = useState<Play[]>(initial)
  const [available, setAvailable] = useState<Play[]>(initialAvailable)
  const [isPending, startTransition] = useTransition()

  // DnD state
  const draggingId = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // ── Drag handlers ──
  const handleDragStart = (e: React.DragEvent, id: string) => {
    draggingId.current = id
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== draggingId.current) setDragOverId(id)
  }

  const handleDragLeave = () => setDragOverId(null)

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

  // ── Add / remove ──
  const handleAdd = (play: Play) => {
    setAvailable((prev) => prev.filter((p) => p.id !== play.id))
    setPlays((prev) => {
      const next = [...prev, play]
      startTransition(async () => {
        await syncPlaybookPlay(playbookId, play.id, true)
        await reorderPlaybookPlays(playbookId, next.map((p) => p.id))
      })
      return next
    })
  }

  const handleRemove = (play: Play) => {
    setPlays((prev) => prev.filter((p) => p.id !== play.id))
    setAvailable((prev) => [play, ...prev])
    startTransition(async () => {
      await syncPlaybookPlay(playbookId, play.id, false)
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Left: ordered plays in playbook */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">In this playbook</h2>
          <span className="flex items-center gap-2 text-xs text-white/40">
            {isPending && <span className="animate-pulse">Saving…</span>}
            <span>{plays.length} move{plays.length !== 1 ? 's' : ''}</span>
          </span>
        </div>

        {plays.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/40">
            No moves yet. Add some from the right column.
          </div>
        ) : (
          <ul className="space-y-2">
            {plays.map((play, idx) => (
              <li
                key={play.id}
                draggable
                onDragStart={(e) => handleDragStart(e, play.id)}
                onDragOver={(e) => handleDragOver(e, play.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, play.id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'flex items-center gap-3 rounded-xl border bg-white/5 p-3 transition',
                  dragOverId === play.id
                    ? 'border-blue-400/60 bg-blue-500/10'
                    : 'border-white/10 hover:bg-white/[0.08]',
                )}
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-white/20 active:cursor-grabbing" />
                <span className="w-5 shrink-0 text-right text-xs font-semibold tabular-nums text-white/30">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/playbook/${play.id}?from=${playbookId}`}
                    className="truncate font-medium text-white transition-colors hover:text-blue-400"
                  >
                    {play.title}
                  </Link>
                  <p className="text-xs text-white/40">{play.category}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(play)}
                  aria-label="Remove from playbook"
                  className="shrink-0 rounded-lg p-1.5 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Right: available plays to add */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Add moves</h2>
          <span className="text-xs text-white/40">{available.length} available</span>
        </div>

        {available.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/40">
            All your saved moves are already in this playbook.
          </div>
        ) : (
          <ul className="space-y-2">
            {available.map((play) => (
              <li
                key={play.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white/80">{play.title}</p>
                  <p className="text-xs text-white/40">{play.category}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdd(play)}
                  aria-label="Add to playbook"
                  className="shrink-0 rounded-lg p-1.5 text-white/30 transition hover:bg-blue-500/10 hover:text-blue-400"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
