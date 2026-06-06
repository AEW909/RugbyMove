'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Formation } from '@/lib/board/storage'
import type { PlayerPosition } from '@/types/play'

type Props = {
  formation: Formation
  onLoad: (players: PlayerPosition[]) => void
  onClose: () => void
}

function pickFirst(count: number, side: 'attack' | 'defend'): number[] {
  return Array.from({ length: count }, (_, i) => i + 1)
}

export default function FormationLoadDialog({ formation, onLoad, onClose }: Props) {
  const attackSlots = formation.slots.filter((s) => s.side === 'attack')
  const defendSlots = formation.slots.filter((s) => s.side === 'defend')
  const ballSlot = formation.slots.find((s) => s.side === 'ball')

  const [attackNums, setAttackNums] = useState<number[]>(() => pickFirst(attackSlots.length, 'attack'))
  const [defendNums, setDefendNums] = useState<number[]>(() => pickFirst(defendSlots.length, 'defend'))

  const toggleNum = (
    num: number,
    current: number[],
    set: (v: number[]) => void,
    required: number,
  ) => {
    if (current.includes(num)) {
      if (current.length > required) set(current.filter((n) => n !== num))
    } else {
      if (current.length < required) set([...current, num])
      else set([...current.slice(1), num])
    }
  }

  const handleLoad = () => {
    const players: PlayerPosition[] = []

    attackSlots.forEach((slot, i) => {
      const num = attackNums[i]
      if (num !== undefined) players.push({ id: `attack-${num}`, x: slot.x, y: slot.y })
    })

    defendSlots.forEach((slot, i) => {
      const num = defendNums[i]
      if (num !== undefined) players.push({ id: `defend-${num}`, x: slot.x, y: slot.y })
    })

    if (ballSlot) players.push({ id: 'ball', x: ballSlot.x, y: ballSlot.y })

    onLoad(players)
    onClose()
  }

  const numLabel = (nums: number[]) =>
    [...nums].sort((a, b) => a - b).map((n) => `#${n}`).join(', ')

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div className="fixed left-1/2 top-1/2 z-[70] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white">{formation.name}</h2>
            <p className="mt-0.5 text-xs text-white/40">Assign jersey numbers to each slot.</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-1 text-white/30 transition hover:text-white/70" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {attackSlots.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-400">
              Attack — {attackSlots.length} slot{attackSlots.length !== 1 ? 's' : ''}
              {attackNums.length > 0 && <span className="ml-2 font-normal normal-case text-white/40">{numLabel(attackNums)}</span>}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleNum(n, attackNums, setAttackNums, attackSlots.length)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-semibold transition',
                    attackNums.includes(n)
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/80',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {defendSlots.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-400">
              Defence — {defendSlots.length} slot{defendSlots.length !== 1 ? 's' : ''}
              {defendNums.length > 0 && <span className="ml-2 font-normal normal-case text-white/40">{numLabel(defendNums)}</span>}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleNum(n, defendNums, setDefendNums, defendSlots.length)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-semibold transition',
                    defendNums.includes(n)
                      ? 'border-red-500 bg-red-600 text-white'
                      : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/80',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {ballSlot && <p className="mb-4 text-xs text-white/30">Ball position included.</p>}

        <button
          type="button"
          onClick={handleLoad}
          disabled={
            (attackSlots.length > 0 && attackNums.length !== attackSlots.length) ||
            (defendSlots.length > 0 && defendNums.length !== defendSlots.length)
          }
          className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90 disabled:opacity-40"
        >
          Load Formation
        </button>
      </div>
    </>
  )
}
