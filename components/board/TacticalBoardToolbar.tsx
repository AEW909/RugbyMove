'use client'

import Image from 'next/image'
import {
  BoxSelect,
  Circle,
  Grid3x3,
  Loader2,
  MousePointer2,
  Pause,
  Pencil,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Presentation,
  RotateCw,
  Save,
  Undo2,
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
  tokenSize: 'sm' | 'md' | 'lg'
  onTokenSizeChange: (size: 'sm' | 'md' | 'lg') => void
}

/** A labeled, visually-bounded cluster of related toolbar buttons. */
function ToolGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.03] py-1 pl-2 pr-1">
      <span className="pr-1 text-[9px] font-bold uppercase tracking-wider text-white/25 select-none">
        {label}
      </span>
      {children}
    </div>
  )
}

const groupButton =
  'inline-flex items-center justify-center rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent'
const groupButtonActive = (active: boolean, colors: string) =>
  cn(groupButton, active ? colors : undefined)

export default function TacticalBoardToolbar({
  board,
  viewOnly,
  desktopViewOnly,
  onToggleViewOnly,
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

      {/* Primary actions — always prominent, never tucked into a group */}
      <button
        type="button"
        onClick={board.isPlaying ? board.stopPlayback : board.playFrames}
        disabled={board.frames.length < 2}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90 disabled:opacity-40"
      >
        {board.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {board.isPlaying ? 'Pause' : 'Play'}
      </button>

      {!viewOnly && (
        <button
          type="button"
          title="Save (Ctrl+S)"
          onClick={board.quickSave}
          disabled={board.isQuickSaving}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-50"
        >
          {board.isQuickSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      )}

      {viewOnly ? (
        <span className="text-sm font-semibold text-white/50">
          {board.activeFrameIndex + 1} / {board.frames.length}
        </span>
      ) : (
        <>
          {/* Edit — frame/history management */}
          <ToolGroup label="Edit">
            <button type="button" title="Add frame" onClick={board.captureFrame} className={groupButton}>
              <Plus className="h-4 w-4" />
            </button>
            <button type="button" title="Reset board" onClick={board.resetBoard} className={groupButton}>
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Undo (Ctrl+Z)"
              onClick={board.undo}
              disabled={!board.canUndo}
              className={groupButton}
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Redo (Ctrl+Y)"
              onClick={board.redo}
              disabled={!board.canRedo}
              className={groupButton}
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Snap to grid"
              onClick={() => board.setSnapGrid((prev) => !prev)}
              className={groupButtonActive(board.snapGrid, 'bg-blue-500/20 text-blue-300')}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
          </ToolGroup>

          {/* Tools — zone + pointer/select/draw, with draw's own sub-controls */}
          <ToolGroup label="Tools">
            <button type="button" title="Add zone" onClick={() => board.addZone(50, 50)} className={groupButton}>
              <Circle className="h-4 w-4" />
            </button>
            <div className="mx-0.5 h-4 w-px bg-white/10" />
            <button
              type="button"
              title="Pointer (P)"
              onClick={() => { board.setTool('pointer'); board.setSelectedPlayerIds(new Set()) }}
              className={groupButtonActive(board.tool === 'pointer', 'bg-blue-500/20 text-blue-300')}
            >
              <MousePointer2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Group Select (G)"
              onClick={() => board.setTool('select')}
              className={groupButtonActive(board.tool === 'select', 'bg-purple-500/20 text-purple-300')}
            >
              <BoxSelect className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Draw lines (D)"
              onClick={() => board.setTool('draw')}
              className={groupButtonActive(board.tool === 'draw', 'bg-emerald-500/20 text-emerald-300')}
            >
              <Pencil className="h-4 w-4" />
            </button>

            {board.tool === 'draw' && !desktopViewOnly && (
              <>
                <div className="mx-0.5 h-4 w-px bg-white/10" />
                {LINE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => board.setLineColor(c.value)}
                    className={cn(
                      'h-5 w-5 shrink-0 rounded-full border-2 transition hover:scale-110',
                      board.lineColor === c.value ? 'scale-110 border-white' : 'border-white/20',
                    )}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
                <button
                  type="button"
                  title="Toggle dashed"
                  onClick={() => board.setLineDashed(!board.lineDashed)}
                  className={groupButtonActive(board.lineDashed, 'bg-emerald-500/20 text-emerald-300')}
                >
                  <span className="text-xs font-bold">- -</span>
                </button>
                {board.activeFrame.lines.length > 0 && (
                  <button
                    type="button"
                    title="Clear all lines"
                    onClick={() => {
                      const ids = board.activeFrame.lines.map((l) => l.id)
                      ids.forEach((id) => board.deleteLine(id))
                    }}
                    className={cn(groupButton, 'text-red-400 hover:bg-red-500/10')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
          </ToolGroup>

          {/* View — pitch orientation + token size */}
          <ToolGroup label="View">
            <button
              type="button"
              title="Rotate pitch"
              onClick={board.togglePitchPortrait}
              className={groupButtonActive(board.pitchPortrait, 'bg-emerald-500/20 text-emerald-300')}
            >
              <RotateCw className="h-4 w-4" />
            </button>
            <div className="mx-0.5 h-4 w-px bg-white/10" />
            <div className="flex items-center overflow-hidden rounded-lg">
              {(['sm', 'md', 'lg'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  title={`${s.toUpperCase()} tokens`}
                  onClick={() => onTokenSizeChange(s)}
                  className={cn(
                    'px-2 py-1 text-xs font-semibold transition',
                    tokenSize === s
                      ? 'bg-white/15 text-white'
                      : 'text-white/40 hover:text-white/70',
                  )}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </ToolGroup>
        </>
      )}

      {(!viewOnly || desktopViewOnly) && (
        <button
          type="button"
          onClick={onToggleViewOnly}
          className={cn(
            'ml-auto inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition',
            desktopViewOnly
              ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
              : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10',
          )}
        >
          <Presentation className="h-4 w-4" />
          {desktopViewOnly ? 'Exit' : 'Present'}
        </button>
      )}

      {!viewOnly && (() => {
        const isErrorStatus =
          !!board.saveStatus &&
          (board.saveStatus.toLowerCase().includes('failed') || board.saveStatus.toLowerCase().includes('error'))

        if (board.isQuickSaving) {
          return (
            <span className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/60">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving…
            </span>
          )
        }
        if (isErrorStatus) {
          return (
            <span className="rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-300">
              {board.saveStatus}
            </span>
          )
        }
        if (board.isDirty) {
          return (
            <span className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Unsaved changes
            </span>
          )
        }
        if (board.saveStatus) {
          return (
            <span className="rounded-xl border border-green-500/30 bg-green-500/10 px-2.5 py-1.5 text-xs font-semibold text-green-300">
              {board.saveStatus}
            </span>
          )
        }
        return null
      })()}
    </div>
  )
}
