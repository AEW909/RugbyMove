'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import TacticalBoard from '@/components/TacticalBoard'
import type { Frame } from '@/types/play'

type Move = {
  id: string
  title: string
  category: string
  description: string | null
  frames: Frame[]
  durations: number[]
  pitchPortrait: boolean
  activePlayers: string[]
}

type Props = {
  playbookName: string
  playbookDescription: string | null
  orgName: string | null
  moves: Move[]
}

const CATEGORY_COLOR: Record<string, string> = {
  Scrum: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
  Lineout: 'border-blue-500/30 bg-blue-500/15 text-blue-300',
  'Open Play': 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  Penalty: 'border-red-500/30 bg-red-500/15 text-red-300',
  'Kick Off': 'border-purple-500/30 bg-purple-500/15 text-purple-300',
  Other: 'border-white/10 bg-white/5 text-white/50',
}

export default function PlayerPortal({ playbookName, playbookDescription, orgName, moves }: Props) {
  const [index, setIndex] = useState(0)

  if (moves.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-white">
        <BookOpen className="mb-4 h-12 w-12 text-white/20" />
        <p className="text-lg font-semibold text-white/50">{playbookName}</p>
        <p className="mt-2 text-sm text-white/30">No moves in this playbook yet.</p>
      </main>
    )
  }

  const move = moves[index]!
  const hasPrev = index > 0
  const hasNext = index < moves.length - 1

  return (
    <main className="flex min-h-dvh flex-col bg-black text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {orgName && (
              <span className="shrink-0 text-xs text-white/40">{orgName} ·</span>
            )}
            <span className="truncate text-sm font-semibold text-white/80">{playbookName}</span>
          </div>
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-white/40">
          {index + 1} / {moves.length}
        </span>
      </header>

      {/* Move title + meta */}
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-black tracking-tight text-white">{move.title}</h1>
          {move.description && (
            <p className="mt-1 text-sm text-white/50">{move.description}</p>
          )}
        </div>
        <span className={cn('mt-0.5 shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold', CATEGORY_COLOR[move.category] ?? CATEGORY_COLOR.Other)}>
          {move.category}
        </span>
      </div>

      {/* Board — takes remaining height */}
      <div className="min-h-0 flex-1 px-2 pb-2">
        <TacticalBoard
          key={move.id}
          initialFrames={move.frames}
          initialDurations={move.durations}
          initialPitchPortrait={move.pitchPortrait}
          initialActivePlayers={move.activePlayers}
          viewOnly
        />
      </div>

      {/* Prev / Next navigation */}
      <nav className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={!hasPrev}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        {/* Move dot indicator */}
        <div className="flex items-center gap-1.5">
          {moves.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                'rounded-full transition',
                i === index
                  ? 'h-2 w-5 bg-blue-500'
                  : 'h-2 w-2 bg-white/20 hover:bg-white/40',
              )}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(moves.length - 1, i + 1))}
          disabled={!hasNext}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </main>
  )
}
