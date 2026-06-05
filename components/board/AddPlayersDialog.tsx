'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Side = 'attack' | 'defence'

type Props = {
  activePlayers: string[] | undefined
  onAdd: (ids: string[]) => void
  onClose: () => void
}

const PRESETS: { label: string; numbers: number[] }[] = [
  { label: 'All', numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
  { label: 'Forwards', numbers: [1, 2, 3, 4, 5, 6, 7, 8] },
  { label: 'Backs', numbers: [9, 10, 11, 12, 13, 14, 15] },
]

export default function AddPlayersDialog({ activePlayers, onAdd, onClose }: Props) {
  const [side, setSide] = useState<Side>('attack')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const isActive = (num: number) => {
    const id = side === 'attack' ? `attack-${num}` : `defend-${num}`
    return activePlayers !== undefined && activePlayers.includes(id)
  }

  const toggle = (num: number) => {
    if (isActive(num)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  const applyPreset = (numbers: number[]) => {
    setSelected(new Set(numbers.filter((n) => !isActive(n))))
  }

  const handleAdd = () => {
    const ids = Array.from(selected).map((n) =>
      side === 'attack' ? `attack-${n}` : `defend-${n}`,
    )
    if (ids.length > 0) onAdd(ids)
    setSelected(new Set())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div
        className="relative z-10 w-full max-w-sm rounded-t-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Add players</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/40 transition hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Team tabs */}
        <div className="mb-4 flex gap-2">
          {(['attack', 'defence'] as Side[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setSide(s); setSelected(new Set()) }}
              className={cn(
                'flex-1 rounded-xl py-2 text-sm font-semibold capitalize transition',
                side === s
                  ? s === 'attack'
                    ? 'bg-blue-600 text-white'
                    : 'bg-red-600 text-white'
                  : 'border border-white/10 bg-white/5 text-white/50 hover:text-white/80',
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Quick presets */}
        <div className="mb-3 flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p.numbers)}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Number grid */}
        <div className="mb-5 grid grid-cols-5 gap-2">
          {Array.from({ length: 15 }, (_, i) => i + 1).map((num) => {
            const active = isActive(num)
            const sel = selected.has(num)
            return (
              <button
                key={num}
                type="button"
                disabled={active}
                onClick={() => toggle(num)}
                className={cn(
                  'flex h-10 items-center justify-center rounded-xl border text-sm font-bold transition',
                  active && 'border-white/5 bg-white/5 text-white/20 cursor-default',
                  !active && sel && (side === 'attack'
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-red-500 bg-red-600 text-white'),
                  !active && !sel && 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white',
                )}
              >
                {num}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          disabled={selected.size === 0}
          onClick={handleAdd}
          className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90 disabled:opacity-40"
        >
          {selected.size === 0
            ? 'Select players above'
            : `Add ${selected.size} player${selected.size > 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}
