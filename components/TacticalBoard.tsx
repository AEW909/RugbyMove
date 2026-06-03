'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import {
  BoxSelect,
  ChevronLeft,
  Grid3x3,
  MousePointer2,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FormationCategory } from '@/lib/board/storage'
import { useTacticalBoard, tokens, SCRUM_FORMATION, LINEOUT_FORMATION } from '@/hooks/useTacticalBoard'
import type { TacticalBoardProps } from '@/hooks/useTacticalBoard'
import PanelSlideOver from '@/components/board/PanelSlideOver'
import type { Line } from '@/types/play'

const LINE_COLORS = [
  { value: '#f8fafc', label: 'White' },
  { value: '#ef4444', label: 'Red' },
  { value: '#facc15', label: 'Yellow' },
  { value: '#60a5fa', label: 'Blue' },
]

const MIN_LINE_LENGTH_PCT = 2

export default function TacticalBoard(props: TacticalBoardProps) {
  const board = useTacticalBoard(props)
  const boardRef = useRef<HTMLDivElement>(null)

  const selectionStartRef = useRef<{ x: number; y: number } | null>(null)
  const [selectionBox, setSelectionBox] = useState<{
    x1: number; y1: number; x2: number; y2: number
  } | null>(null)

  const drawStartRef = useRef<{ x: number; y: number } | null>(null)
  const [pendingLine, setPendingLine] = useState<{
    from: { x: number; y: number }; to: { x: number; y: number }
  } | null>(null)

  const { isGuest = false, playTitle = 'Untitled move', viewOnly = false } = props

  const getBoardPct = (clientX: number, clientY: number) => {
    const el = boardRef.current
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    return {
      x: Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100)),
    }
  }

  // ── Player drag ──
  const updatePlayerPosition = (id: string, clientX: number, clientY: number) => {
    const el = boardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    board.movePlayer(id, ((clientX - rect.left) / rect.width) * 100, ((clientY - rect.top) / rect.height) * 100)
  }

  const handlePointerDown = (id: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    updatePlayerPosition(id, e.clientX, e.clientY)
  }

  const handlePointerMove = (id: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.buttons !== 1) return
    updatePlayerPosition(id, e.clientX, e.clientY)
  }

  // ── Board pointer handlers ──
  const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as Element

    if (board.tool === 'select') {
      if (target.closest('[data-player]')) return
      e.currentTarget.setPointerCapture(e.pointerId)
      const { x, y } = getBoardPct(e.clientX, e.clientY)
      selectionStartRef.current = { x, y }
      setSelectionBox({ x1: x, y1: y, x2: x, y2: y })
      board.setSelectedPlayerIds(new Set())
      return
    }

    if (board.tool === 'draw') {
      if (target.tagName.toLowerCase() === 'line') return
      e.currentTarget.setPointerCapture(e.pointerId)
      const { x, y } = getBoardPct(e.clientX, e.clientY)
      drawStartRef.current = { x, y }
      setPendingLine({ from: { x, y }, to: { x, y } })
    }
  }

  const handleBoardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return

    if (board.tool === 'select' && selectionStartRef.current) {
      const { x, y } = getBoardPct(e.clientX, e.clientY)
      setSelectionBox({ x1: selectionStartRef.current.x, y1: selectionStartRef.current.y, x2: x, y2: y })
      return
    }

    if (board.tool === 'draw' && drawStartRef.current) {
      const { x, y } = getBoardPct(e.clientX, e.clientY)
      setPendingLine({ from: drawStartRef.current, to: { x, y } })
    }
  }

  const handleBoardPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (board.tool === 'select' && selectionStartRef.current) {
      const { x, y } = getBoardPct(e.clientX, e.clientY)
      const minX = Math.min(selectionStartRef.current.x, x)
      const minY = Math.min(selectionStartRef.current.y, y)
      const maxX = Math.max(selectionStartRef.current.x, x)
      const maxY = Math.max(selectionStartRef.current.y, y)
      board.setSelectedPlayerIds(
        new Set(
          board.activeFrame.players
            .filter((p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY)
            .map((p) => p.id),
        ),
      )
      selectionStartRef.current = null
      setSelectionBox(null)
      return
    }

    if (board.tool === 'draw' && drawStartRef.current && pendingLine) {
      const dx = pendingLine.to.x - pendingLine.from.x
      const dy = pendingLine.to.y - pendingLine.from.y
      if (Math.sqrt(dx * dx + dy * dy) >= MIN_LINE_LENGTH_PCT) {
        const line: Line = {
          id: crypto.randomUUID(),
          from: pendingLine.from,
          to: pendingLine.to,
          color: board.lineColor,
          dashed: board.lineDashed,
        }
        board.addLine(line)
      }
      drawStartRef.current = null
      setPendingLine(null)
    }
  }

  return (
    <section className="overflow-visible rounded-xl border border-white/10 bg-black shadow-toolbar">
      {/* ── Toolbar ── */}
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
              onClick={() => board.loadFormation(SCRUM_FORMATION)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              <Users className="h-4 w-4" />
              Scrum
            </button>
            <button
              type="button"
              onClick={() => board.loadFormation(LINEOUT_FORMATION)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              <Users className="h-4 w-4" />
              Lineout
            </button>

            <div className="h-5 w-px bg-white/10" />

            {/* Tool buttons */}
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

            {/* Draw tool colour + dashed options */}
            {board.tool === 'draw' && (
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
      </div>

      {/* Fixed side tab */}
      {!viewOnly && (
        <button
          type="button"
          onClick={() => board.setPanelOpen(true)}
          className={cn(
            'fixed right-0 top-1/2 z-30 -translate-y-1/2 flex items-center rounded-l-xl bg-gradient-to-b from-blue-500 to-purple-600 py-6 pl-2 pr-1.5 shadow-lg transition hover:from-blue-400 hover:to-purple-500',
            board.panelOpen && 'pointer-events-none opacity-0',
          )}
          aria-label="Open panel"
        >
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
      )}

      {/* ── Board ── */}
      <div className="p-2 sm:p-4">
        {/* Frame strip */}
        <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-1 sm:gap-2" style={{ touchAction: 'pan-x' }}>
          <span className="shrink-0 text-xs font-semibold uppercase text-white/40">Frames</span>
          {board.frames.map((frame, index) => (
            viewOnly ? (
              <button
                key={`${frame.players.length}-${index}`}
                type="button"
                onClick={() => { board.stopPlayback(); board.setActiveFrameIndex(index) }}
                className={cn(
                  'shrink-0 rounded-xl border px-4 text-sm font-semibold transition',
                  'min-h-[44px] min-w-[44px]',
                  board.activeFrameIndex === index
                    ? 'border-blue-500/50 bg-blue-500/20 text-blue-300'
                    : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10',
                )}
              >
                {index + 1}
              </button>
            ) : (
              <div
                key={`${frame.players.length}-${index}`}
                className={cn(
                  'flex shrink-0 overflow-hidden rounded-xl border transition',
                  board.activeFrameIndex === index
                    ? 'border-blue-500/50 bg-blue-500/20 text-blue-300'
                    : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10',
                )}
              >
                <button
                  type="button"
                  onClick={() => { board.stopPlayback(); board.setActiveFrameIndex(index) }}
                  className="px-3 py-1.5 text-sm font-semibold"
                >
                  {index + 1}
                </button>
                <button
                  type="button"
                  onClick={() => board.deleteFrame(index)}
                  className="flex w-8 items-center justify-center border-l border-white/10 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
                  aria-label={`Delete frame ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          ))}
        </div>

        {/* Board canvas */}
        <div
          ref={boardRef}
          className={cn(
            'relative aspect-[12/7] w-full overflow-hidden rounded-xl border border-white/10 bg-emerald-700 shadow-inner',
            !viewOnly && 'min-h-[260px]',
            !viewOnly && (board.tool === 'select' || board.tool === 'draw') && 'cursor-crosshair',
          )}
          aria-label="Rugby tactical board"
          onPointerDown={viewOnly ? undefined : handleBoardPointerDown}
          onPointerMove={viewOnly ? undefined : handleBoardPointerMove}
          onPointerUp={viewOnly ? undefined : handleBoardPointerUp}
        >
          {/* Pitch markings — proportions based on 120m×70m full pitch (10m in-goals) */}
          <div className="pointer-events-none absolute inset-0">
            {/* In-goal areas: 10m deep = 8.33% of 120m */}
            <div className="absolute inset-y-0 left-0 w-[8.33%] border-r-2 border-white/80 bg-blue-900/20" />
            <div className="absolute inset-y-0 right-0 w-[8.33%] border-l-2 border-white/80 bg-red-900/20" />
            {/* 22m lines: 32m from dead-ball = 26.67% */}
            <div className="absolute inset-y-0 left-[26.67%] w-px bg-white/65" />
            <div className="absolute inset-y-0 right-[26.67%] w-px bg-white/65" />
            {/* 10m lines: 50m from dead-ball = 41.67% */}
            <div className="absolute inset-y-0 left-[41.67%] w-px border-l border-dashed border-white/45" />
            <div className="absolute inset-y-0 right-[41.67%] w-px border-r border-dashed border-white/45" />
            {/* Halfway line: 60m = 50% */}
            <div className="absolute inset-y-0 left-1/2 w-px bg-white/70" />
            {/* Centre spot cross */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/30" />
          </div>

          {/* Lines SVG — pointer-events enabled in draw mode */}
          <svg
            className={cn(
              'absolute inset-0 h-full w-full',
              !viewOnly && board.tool === 'draw' ? 'pointer-events-auto' : 'pointer-events-none',
            )}
          >
            {board.activeFrame.lines.map((line) => (
              <g key={line.id}>
                {!viewOnly && board.tool === 'draw' && (
                  <line
                    x1={`${line.from.x}%`} y1={`${line.from.y}%`}
                    x2={`${line.to.x}%`} y2={`${line.to.y}%`}
                    stroke="transparent"
                    strokeWidth="16"
                    strokeLinecap="round"
                    style={{ cursor: 'pointer' }}
                    onClick={() => board.deleteLine(line.id)}
                  />
                )}
                <line
                  x1={`${line.from.x}%`} y1={`${line.from.y}%`}
                  x2={`${line.to.x}%`} y2={`${line.to.y}%`}
                  stroke={line.color ?? '#f8fafc'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={line.dashed ? '8 8' : undefined}
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            ))}

            {pendingLine && (
              <line
                x1={`${pendingLine.from.x}%`} y1={`${pendingLine.from.y}%`}
                x2={`${pendingLine.to.x}%`} y2={`${pendingLine.to.y}%`}
                stroke={board.lineColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={board.lineDashed ? '8 8' : undefined}
                opacity={0.55}
                style={{ pointerEvents: 'none' }}
              />
            )}
          </svg>

          {/* Selection box */}
          {selectionBox && (
            <div
              className="pointer-events-none absolute border-2 border-dashed border-yellow-400 bg-yellow-400/10"
              style={{
                left: `${Math.min(selectionBox.x1, selectionBox.x2)}%`,
                top: `${Math.min(selectionBox.y1, selectionBox.y2)}%`,
                width: `${Math.abs(selectionBox.x2 - selectionBox.x1)}%`,
                height: `${Math.abs(selectionBox.y2 - selectionBox.y1)}%`,
              }}
            />
          )}

          {/* Player tokens */}
          {tokens.map((token) => {
            const player = board.playerById.get(token.id)
            if (!player) return null
            const canDrag = !viewOnly && board.tool !== 'draw'

            return (
              <button
                type="button"
                key={token.id}
                data-player={token.id}
                onPointerDown={canDrag ? handlePointerDown(token.id) : undefined}
                onPointerMove={canDrag ? handlePointerMove(token.id) : undefined}
                className={cn(
                  'absolute flex select-none items-center justify-center border-2 text-[10px] font-bold shadow-lg focus:outline-none',
                  canDrag && 'touch-none transition-transform hover:scale-110 focus:ring-2 focus:ring-yellow-300',
                  token.side === 'attack' && 'border-blue-100 bg-blue-600 text-white',
                  token.side === 'defend' && 'border-red-100 bg-red-600 text-white',
                  token.side === 'ball' &&
                    'h-6 w-10 rounded-[50%] border-emerald-900 bg-slate-50 text-transparent',
                  token.side !== 'ball' && 'h-7 w-7 rounded-full sm:h-8 sm:w-8',
                  !viewOnly && board.selectedPlayerIds.has(token.id) &&
                    'ring-2 ring-yellow-400 ring-offset-1',
                )}
                style={{
                  left: `${player.x}%`,
                  top: `${player.y}%`,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: canDrag ? undefined : 'none',
                }}
                aria-label={
                  token.side === 'ball'
                    ? 'Ball'
                    : `${token.side === 'attack' ? 'Attacking' : 'Defending'} player ${token.label}`
                }
              >
                {token.side === 'ball' ? (
                  <>
                    <span className="absolute inset-[2px] rounded-[50%] border-t-2 border-[#e11d48]" />
                    <span className="absolute inset-[4px] rounded-[50%] border-b-2 border-[#2563eb]" />
                    <span className="absolute left-[5px] top-1/2 h-[14px] w-[4px] -translate-y-1/2 rounded-[50%] border-l-2 border-[#16a34a]" />
                    <span className="absolute right-[5px] top-1/2 h-[14px] w-[4px] -translate-y-1/2 rounded-[50%] border-r-2 border-[#16a34a]" />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[6px] font-black tracking-[0.08em] text-slate-900">
                      G
                    </span>
                  </>
                ) : (
                  token.label
                )}
              </button>
            )
          })}
        </div>
      </div>

      {!viewOnly && (
        <PanelSlideOver
          isOpen={board.panelOpen}
          onClose={() => board.setPanelOpen(false)}
          activeTab={board.panelTab}
          onTabChange={board.setPanelTab}
          formations={board.formations}
          savedPlays={board.savedPlays}
          playbooks={board.playbooks}
          onLoadFormation={board.loadFormation}
          onOpenSaveFormation={() => {
            board.setPanelOpen(false)
            board.setShowFormationModal(true)
          }}
          onLoadPlay={board.handleLoadPlay}
          onSaveToPlaybook={board.handleSaveToPlaybook}
          onSaveLocally={board.handleSaveLocally}
          onExport={board.exportMove}
          initialTitle={playTitle}
          saveStatus={board.saveStatus}
          isGuest={isGuest}
        />
      )}

      {!viewOnly && board.showFormationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => board.setShowFormationModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-xl backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-white">Save formation</h2>
              <button
                type="button"
                onClick={() => board.setShowFormationModal(false)}
                className="rounded-lg p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-sm text-white/50">
              Saves this frame&apos;s player positions as a starting point for new moves.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-white/80">
                Name
                <input
                  value={board.formationName}
                  onChange={(e) => board.setFormationName(e.target.value)}
                  placeholder="e.g. Tight scrum left"
                  autoFocus
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-normal text-white outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                />
              </label>
              <label className="block text-sm font-semibold text-white/80">
                Category
                <select
                  value={board.formationCategory}
                  onChange={(e) => board.setFormationCategory(e.target.value as FormationCategory)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-normal text-white outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                >
                  <option value="Scrum">Scrum</option>
                  <option value="Lineout">Lineout</option>
                  <option value="Penalty">Penalty</option>
                  <option value="Open Play">Open Play</option>
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => board.setShowFormationModal(false)}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={board.saveFormation}
                disabled={!board.formationName.trim()}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90 disabled:opacity-50"
              >
                Save formation
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
