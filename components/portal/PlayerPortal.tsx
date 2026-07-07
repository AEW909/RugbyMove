'use client'

import { useState } from 'react'
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import TacticalBoard from '@/components/TacticalBoard'
import type { AnimationData, PlayCategory } from '@/types/play'

type Move = {
  id: string
  title: string
  category: string
  description: string | null
  animationData: AnimationData
}

type Props = {
  playbookName: string
  moves: Move[]
}

const CATEGORY_COLORS: Record<string, string> = {
  Scrum: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
  Lineout: 'border-blue-500/30 bg-blue-500/15 text-blue-300',
  'Open Play': 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  Penalty: 'border-red-500/30 bg-red-500/15 text-red-300',
  'Kick Off': 'border-purple-500/30 bg-purple-500/15 text-purple-300',
  Other: 'border-white/15 bg-white/5 text-white/60',
}

export default function PlayerPortal({ playbookName, moves }: Props) {
  const [index, setIndex] = useState(0)
  const move = moves[index]

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-xs text-white/40">Playbook</p>
          <p className="truncate text-sm font-bold text-white">{playbookName}</p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-white/50">
          {moves.length > 0 ? `${index + 1} / ${moves.length}` : '0 moves'}
        </span>
      </header>

      {moves.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-white/40">
          <BookOpen className="h-10 w-10" />
          <p className="text-sm">No moves in this playbook yet.</p>
        </div>
      ) : (
        <>
          {/* Move info */}
          {move && (
            <div className="border-b border-white/10 px-4 py-3 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-black tracking-tight text-white">{move.title}</h1>
                  {move.description && (
                    <p className="mt-0.5 text-sm text-white/50">{move.description}</p>
                  )}
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[move.category] ?? CATEGORY_COLORS.Other}`}>
                  {move.category}
                </span>
              </div>
            </div>
          )}

          {/* Board */}
          {move && (
            <div className="flex min-h-0 flex-1">
              <TacticalBoard
                key={move.id}
                initialFrames={move.animationData.frames}
                initialDurations={move.animationData.durations}
                initialPitchPortrait={move.animationData.pitchPortrait}
                playTitle={move.title}
                playCategory={move.category as PlayCategory}
                playDescription={move.description}
                viewOnly
              />
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>

            {/* Dot indicators */}
            <div className="flex items-center gap-1.5">
              {moves.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`rounded-full transition-all ${
                    i === index
                      ? 'h-2 w-5 bg-blue-500'
                      : 'h-2 w-2 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(moves.length - 1, i + 1))}
              disabled={index === moves.length - 1}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-30"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </main>
  )
}
