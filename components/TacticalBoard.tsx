'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { BoxSelect, ChevronLeft, Grid3x3, MousePointer2, Pause, Play, Plus, RotateCcw, Trash2, Users, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FormationCategory } from '@/lib/board/storage'
import { useTacticalBoard, tokens, SCRUM_FORMATION, LINEOUT_FORMATION } from '@/hooks/useTacticalBoard'
import type { TacticalBoardProps } from '@/hooks/useTacticalBoard'
import PanelSlideOver from '@/components/board/PanelSlideOver'

export default function TacticalBoard(props: TacticalBoardProps) {
  const board = useTacticalBoard(props)
  const boardRef = useRef<HTMLDivElement>(null)
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null)
  const [selectionBox, setSelectionBox] = useState<{
    x1: number; y1: number; x2: number; y2: number
  } | null>(null)

  const { isGuest = false, playTitle = 'Untitled move' } = props

  const updatePlayerPosition = (id: string, clientX: number, clientY: number) => {
    const el = boardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const rawX = ((clientX - rect.left) / rect.width) * 100
    const rawY = ((clientY - rect.top) / rect.height) * 100
    board.movePlayer(id, rawX, rawY)
  }

  const handlePointerDown =
    (id: string) => (event: React.PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId)
      updatePlayerPosition(id, event.clientX, event.clientY)
    }

  const handlePointerMove =
    (id: string) => (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.buttons !== 1) return
      updatePlayerPosition(id, event.clientX, event.clientY)
    }

  const getBoardPct = (clientX: number, clientY: number) => {
    const el = boardRef.current
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    return { x: ((clientX - r.left) / r.width) * 100, y: ((clientY - r.top) / r.height) * 100 }
  }

  const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (board.tool !== 'select') return
    if ((e.target as HTMLElement).closest('[data-player]')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y } = getBoardPct(e.clientX, e.clientY)
    selectionStartRef.current = { x, y }
    setSelectionBox({ x1: x, y1: y, x2: x, y2: y })
    board.setSelectedPlayerIds(new Set())
  }

  const handleBoardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (board.tool !== 'select' || !selectionStartRef.current || e.buttons !== 1) return
    const { x, y } = getBoardPct(e.clientX, e.clientY)
    setSelectionBox({ x1: selectionStartRef.current.x, y1: selectionStartRef.current.y, x2: x, y2: y })
  }

  const handleBoardPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (board.tool !== 'select' || !selectionStartRef.current) return
    const { x, y } = getBoardPct(e.clientX, e.clientY)
    const minX = Math.min(selectionStartRef.current.x, x)
    const minY = Math.min(selectionStartRef.current.y, y)
    const maxX = Math.max(selectionStartRef.current.x, x)
    const maxY = Math.max(selectionStartRef.current.y, y)
    const selected = new Set(
      board.activeFrame.players
        .filter((p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY)
        .map((p) => p.id),
    )
    board.setSelectedPlayerIds(selected)
    selectionStartRef.current = null
    setSelectionBox(null)
  }

  return (
    <section className="overflow-visible rounded-xl border border-white/10 bg-black shadow-toolbar">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
        <a href="/" aria-label="Home">
          <Image src="/logo-icon.png" alt="RugbyMove" width={36} height={36} className="h-9 w-9 rounded-xl transition hover:opacity-80" />
        </a>

        <div className="h-5 w-px bg-white/10" />

        <button
          type="button"
          onClick={board.isPlaying ? board.stopPlayback : board.playFrames}
          disabled={board.frames.length < 2}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90 disabled:opacity-40"
        >
          {board.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {board.isPlaying ? 'Pause' : 'Play'}
        </button>
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
      </div>

      {/* Fixed side tab — opens the panel */}
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

      {/* ── Board ── */}
      <div className="p-4">
        {/* ── Frame strip ── */}
        <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 text-xs font-semibold uppercase text-slate-400">Frames</span>
          {board.frames.map((frame, index) => (
            <div
              key={`${frame.players.length}-${index}`}
              className={cn(
                'flex shrink-0 overflow-hidden rounded-md border transition',
                board.activeFrameIndex === index
                  ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              <button
                type="button"
                onClick={() => {
                  board.stopPlayback()
                  board.setActiveFrameIndex(index)
                }}
                className="px-3 py-1.5 text-sm font-semibold"
                aria-label={`Select frame ${index + 1}`}
              >
                {index + 1}
              </button>
              <button
                type="button"
                onClick={() => board.deleteFrame(index)}
                className="flex w-8 items-center justify-center border-l border-inherit text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                aria-label={`Delete frame ${index + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div
          ref={boardRef}
          className={cn(
            'relative aspect-[4/3] min-h-[360px] overflow-hidden rounded-md border border-slate-200 bg-emerald-700 shadow-inner',
            board.tool === 'select' && 'cursor-crosshair',
          )}
          aria-label="Rugby tactical board"
          onPointerDown={handleBoardPointerDown}
          onPointerMove={handleBoardPointerMove}
          onPointerUp={handleBoardPointerUp}
        >
          {/* Pitch — full height */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 grid grid-cols-10">
              {Array.from({ length: 10 }, (_, index) => (
                <div
                  key={index}
                  className={cn(
                    'border-r border-white/35',
                    index === 0 || index === 9 ? 'bg-emerald-900/15' : 'bg-transparent',
                  )}
                />
              ))}
            </div>
            <div className="absolute inset-y-0 left-1/2 w-px bg-white/70" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
            <div className="absolute left-[5%] top-0 h-full w-px bg-white/80" />
            <div className="absolute right-[5%] top-0 h-full w-px bg-white/80" />
            <div className="absolute left-[22%] top-0 h-full w-px border-l border-dashed border-white/65" />
            <div className="absolute right-[22%] top-0 h-full w-px border-l border-dashed border-white/65" />
          </div>

          {/* Attack tray — left strip */}
          <div className="absolute inset-y-0 left-0 w-[8%] border-r border-dashed border-blue-300/60 bg-blue-900/30" />
          {/* Defence tray — right strip */}
          <div className="absolute inset-y-0 right-0 w-[8%] border-l border-dashed border-red-300/60 bg-red-900/30" />

          {/* Move lines SVG */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            {board.activeFrame.lines.map((line) => (
              <line
                key={line.id}
                x1={`${line.from.x}%`}
                y1={`${line.from.y}%`}
                x2={`${line.to.x}%`}
                y2={`${line.to.y}%`}
                stroke={line.color ?? '#f8fafc'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={line.dashed ? '8 8' : undefined}
              />
            ))}
          </svg>

          {/* Group-select drag rectangle */}
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

            return (
              <button
                type="button"
                key={token.id}
                data-player={token.id}
                onPointerDown={handlePointerDown(token.id)}
                onPointerMove={handlePointerMove(token.id)}
                className={cn(
                  'absolute flex touch-none select-none items-center justify-center border-2 text-[10px] font-bold shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-300',
                  token.side === 'attack' && 'border-blue-100 bg-blue-600 text-white',
                  token.side === 'defend' && 'border-red-100 bg-red-600 text-white',
                  token.side === 'ball' &&
                    'h-6 w-10 rounded-[50%] border-emerald-900 bg-slate-50 text-transparent',
                  token.side !== 'ball' && 'h-7 w-7 rounded-full',
                  board.selectedPlayerIds.has(token.id) && 'ring-2 ring-yellow-400 ring-offset-1',
                )}
                style={{
                  left: `${player.x}%`,
                  top: `${player.y}%`,
                  transform: 'translate(-50%, -50%)',
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

      {board.showFormationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => board.setShowFormationModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-950">Save formation</h2>
              <button
                type="button"
                onClick={() => board.setShowFormationModal(false)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Saves this frame&apos;s player positions as a starting point for new moves.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Name
                <input
                  value={board.formationName}
                  onChange={(e) => board.setFormationName(e.target.value)}
                  placeholder="e.g. Tight scrum left"
                  autoFocus
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal text-slate-900 outline-none transition focus:border-emerald-700"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Category
                <select
                  value={board.formationCategory}
                  onChange={(e) => board.setFormationCategory(e.target.value as FormationCategory)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal text-slate-900 outline-none transition focus:border-emerald-700"
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
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={board.saveFormation}
                disabled={!board.formationName.trim()}
                className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
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
