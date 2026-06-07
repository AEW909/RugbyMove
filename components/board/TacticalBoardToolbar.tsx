'use client'

import Image from 'next/image'
import {
  BoxSelect,
  Circle,
  Grid3x3,
  MousePointer2,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UseTacticalBoardReturn } from '@/hooks/useTacticalBoard'

export const LINE_COLORS = [
  { value: '#f8fafc', label: 'White' },
  { value: '#ef4444', label: 'Red' },
  { value: '#facc15', label: 'Yellow' },
  { value: '#60a5fa', label: 'Blue' },
]

type Props = {
  board: UseTacticalBoardReturn
  viewOnly: boolean
  desktopViewOnly: boolean
  onToggleViewOnly: () => void
  onShowAddPlayers: () => void
  tokenSize: 'sm' | 'md' | 'lg'
  onTokenSizeChange: (size: 'sm' | 'md' | 'lg') => void
}

export default function TacticalBoardToolbar({
  board,
  viewOnly,
  desktopViewOnly,
  onToggleViewOnly,
  onShowAddPlayers,
  tokenSize,
  onTokenSizeChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
      {!viewOnly && (
        <>
          <a href="/" aria-label="Home">
            <Image src="/logo-icon.png" alt="RugbyMove" width={36} height={36} className="h-9 w-9 rounded-xl transition hover:opacity-80" />
          </a>
          <div className="h-5 w-px bg-white/10" />
        </>
      )}

      <button
        type="button"
        onClick={board.isPlaying ? board.stopPlayback : board.playFrames}
        disabled={board.frames.length < 2}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90 disabled:opacity-40"
      >
        {board.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {board.isPlaying ? 'Pause' : 'Play'}
      </button>

      {viewOnly ? (
        <span className="text-sm font-semibold text-white/50">
          {board.activeFrameIndex + 1} / {board.frames.length}
        </span>
      ) : (
        <>
          <button
            type="button"
            onClick={board.captureFrame}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            <Plus className="h-4 w-4" />
            Frame
          </button>
          <button
            type="button"
            onClick={board.resetBoard}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={() => board.setSnapGrid((prev) => !prev)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition',
              board.snapGrid
                ? 'border-blue-500/50 bg-blue-500/20 text-blue-300'
                : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10',
            )}
          >
            <Grid3x3 className="h-4 w-4" />
            Snap
          </button>

          <div className="h-5 w-px bg-white/10" />

          <button
            type="button"
            onClick={() => board.addZone(50, 50)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            <Circle className="h-4 w-4" />
            Zone
          </button>
          <button
            type="button"
            onClick={onShowAddPlayers}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            <Users className="h-4 w-4" />
            Add players
          </button>

          <div className="h-5 w-px bg-white/10" />

          <button
            type="button"
            title="Pointer (P)"
            onClick={() => { board.setTool('pointer'); board.setSelectedPlayerIds(new Set()) }}
            className={cn(
              'inline-flex items-center justify-center rounded-xl border p-2 transition',
              board.tool === 'pointer'
                ? 'border-blue-500/50 bg-blue-500/20 text-blue-300'
                : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10',
            )}
          >
            <MousePointer2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Group Select (G)"
            onClick={() => board.setTool('select')}
            className={cn(
              'inline-flex items-center justify-center rounded-xl border p-2 transition',
              board.tool === 'select'
                ? 'border-purple-500/50 bg-purple-500/20 text-purple-300'
                : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10',
            )}
          >
            <BoxSelect className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Draw lines (D)"
            onClick={() => board.setTool('draw')}
            className={cn(
              'inline-flex items-center justify-center rounded-xl border p-2 transition',
              board.tool === 'draw'
                ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10',
            )}
          >
            <Pencil className="h-4 w-4" />
          </button>

          <div className="h-5 w-px bg-white/10" />

          <button
            type="button"
            onClick={onToggleViewOnly}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition',
              desktopViewOnly
                ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10',
            )}
          >
            {desktopViewOnly ? 'View' : 'Edit'}
          </button>

          <button
            type="button"
            title="Rotate pitch"
            onClick={board.togglePitchPortrait}
            className={cn(
              'inline-flex items-center justify-center rounded-xl border p-2 transition',
              board.pitchPortrait
                ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10',
            )}
          >
            <RotateCw className="h-4 w-4" />
          </button>

          <div className="h-5 w-px bg-white/10" />

          {/* Player size toggle */}
          <div className="flex items-center rounded-xl border border-white/15 bg-white/5 overflow-hidden">
            {(['sm', 'md', 'lg'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onTokenSizeChange(s)}
                className={cn(
                  'px-2.5 py-1.5 text-xs font-semibold transition',
                  tokenSize === s
                    ? 'bg-white/15 text-white'
                    : 'text-white/40 hover:text-white/70',
                )}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>

          {board.tool === 'draw' && !desktopViewOnly && (
            <>
              <div className="h-5 w-px bg-white/10" />
              {LINE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => board.setLineColor(c.value)}
                  className={cn(
                    'h-6 w-6 rounded-full border-2 transition hover:scale-110',
                    board.lineColor === c.value ? 'scale-110 border-white' : 'border-white/20',
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}
              <button
                type="button"
                title="Toggle dashed"
                onClick={() => board.setLineDashed(!board.lineDashed)}
                className={cn(
                  'rounded-xl border px-2 py-1.5 text-xs font-semibold transition',
                  board.lineDashed
                    ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                    : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10',
                )}
              >
                - - -
              </button>
              {board.activeFrame.lines.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const ids = board.activeFrame.lines.map((l) => l.id)
                    ids.forEach((id) => board.deleteLine(id))
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </>
          )}
        </>
      )}

      {!viewOnly && board.isDirty && (
        <span className="ml-auto flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Unsaved changes
        </span>
      )}
    </div>
  )
}
