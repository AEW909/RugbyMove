'use client'

import { useRef } from 'react'
import { ChevronLeft, Grid3x3, Home, Pause, Play, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FormationCategory } from '@/lib/board/storage'
import { useTacticalBoard, tokens } from '@/hooks/useTacticalBoard'
import type { TacticalBoardProps } from '@/hooks/useTacticalBoard'
import PanelSlideOver from '@/components/board/PanelSlideOver'
import DefaultsModal from '@/components/board/DefaultsModal'

export default function TacticalBoard(props: TacticalBoardProps) {
  const board = useTacticalBoard(props)
  const boardRef = useRef<HTMLDivElement>(null)

  const { isGuest = false, setupRequired, playTitle = 'Untitled move' } = props

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

  return (
    <section className="overflow-visible rounded-lg border border-emerald-900/10 bg-white shadow-toolbar">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
        >
          <Home className="h-4 w-4" />
          Home
        </a>

        <div className="h-5 w-px bg-slate-200" />

        <button
          type="button"
          onClick={board.isPlaying ? board.stopPlayback : board.playFrames}
          disabled={board.frames.length < 2}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {board.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {board.isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={board.captureFrame}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
          Frame
        </button>
        <button
          type="button"
          onClick={board.resetBoard}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
        <button
          type="button"
          onClick={() => board.setSnapGrid((prev) => !prev)}
          className={cn(
            'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition',
            board.snapGrid
              ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
              : 'border-slate-300 text-slate-800 hover:bg-slate-50',
          )}
        >
          <Grid3x3 className="h-4 w-4" />
          Snap
        </button>
      </div>

      {/* Fixed side tab — opens the panel */}
      <button
        type="button"
        onClick={() => board.setPanelOpen(true)}
        className={cn(
          'fixed right-0 top-1/2 z-30 -translate-y-1/2 flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-white py-6 pl-1.5 pr-1 shadow-md transition hover:bg-slate-50',
          board.panelOpen && 'pointer-events-none opacity-0',
        )}
        aria-label="Open panel"
      >
        <ChevronLeft className="h-4 w-4 text-slate-500" />
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
          className="relative aspect-[4/3] min-h-[360px] overflow-hidden rounded-md border border-slate-200 bg-emerald-700 shadow-inner"
          aria-label="Rugby tactical board"
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

          {/* Player tokens */}
          {tokens.map((token) => {
            const player = board.playerById.get(token.id)
            if (!player) return null

            return (
              <button
                type="button"
                key={token.id}
                onPointerDown={handlePointerDown(token.id)}
                onPointerMove={handlePointerMove(token.id)}
                className={cn(
                  'absolute flex touch-none select-none items-center justify-center border-2 text-[10px] font-bold shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-300',
                  token.side === 'attack' && 'border-blue-100 bg-blue-600 text-white',
                  token.side === 'defend' && 'border-red-100 bg-red-600 text-white',
                  token.side === 'ball' &&
                    'h-6 w-10 rounded-[50%] border-emerald-900 bg-slate-50 text-transparent',
                  token.side !== 'ball' && 'h-7 w-7 rounded-full',
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

      {board.showDefaultsModal && setupRequired && (
        <DefaultsModal
          teams={setupRequired.teams}
          playbooks={setupRequired.playbooks}
          onComplete={(teamId, playbookId) => {
            board.setShowDefaultsModal(false)
            board.setPlaybooks((prev) => {
              const alreadyInList = prev.some((pb) => pb.id === playbookId)
              return alreadyInList ? prev : [...prev, { id: playbookId, name: '' }]
            })
          }}
          onSkip={() => board.setShowDefaultsModal(false)}
        />
      )}

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
