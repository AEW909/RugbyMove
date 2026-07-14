'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CalendarDays, ChevronDown, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTacticalBoard } from '@/hooks/useTacticalBoard'
import type { TacticalBoardProps } from '@/hooks/useTacticalBoard'
import { useBoardGestures } from '@/hooks/useBoardGestures'
import { useIsMobile } from '@/hooks/useIsMobile'
import TacticalBoardToolbar from '@/components/board/TacticalBoardToolbar'
import FrameTimeline from '@/components/board/FrameTimeline'
import PitchCanvas from '@/components/board/PitchCanvas'
import PanelSlideOver from '@/components/board/PanelSlideOver'
import SaveFormationModal from '@/components/board/SaveFormationModal'
import { PLAY_CATEGORIES } from '@/types/play'
import type { PlayCategory } from '@/types/play'

type Props = TacticalBoardProps & {
  /** Only provided by the standalone /playbook/[id] page — renders the
   *  editable header (back link, title, category, description). Omitted by
   *  embeds (player portal) that already have their own header. */
  backHref?: string
  backLabel?: string
  updatedAt?: string
}

export default function TacticalBoard(props: Props) {
  const board = useTacticalBoard(props)
  const isMobile = useIsMobile()

  const { viewOnly: viewOnlyProp = false, backHref, backLabel, updatedAt } = props
  const [desktopViewOnly, setDesktopViewOnly] = useState(false)
  const [tokenSize, setTokenSize] = useState<'sm' | 'md' | 'lg'>('md')
  const [showDescription, setShowDescription] = useState(false)
  const viewOnly = viewOnlyProp || isMobile || desktopViewOnly

  const gestures = useBoardGestures({
    tool: board.tool,
    viewOnly,
    snapGrid: board.snapGrid,
    activeFramePlayers: board.activeFrame.players,
    setSelectedPlayerIds: board.setSelectedPlayerIds,
    lineColor: board.lineColor,
    lineDashed: board.lineDashed,
    onAddLine: board.addLine,
    onMovePlayer: board.movePlayer,
    pitchPortrait: board.pitchPortrait,
  })

  return (
    <section className={cn('flex min-h-0 flex-1 flex-col overflow-hidden bg-black', !isMobile && 'rounded-xl border border-white/10 shadow-toolbar')}>
      {backHref && (
        <header className="flex shrink-0 flex-col border-b border-white/10 px-4 py-2 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link href={backHref} className="shrink-0 text-sm font-medium text-white/40 transition-colors hover:text-white">
              {backLabel}
            </Link>
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              {viewOnly ? (
                <span className="hidden shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold uppercase text-white/50 sm:inline">
                  {board.category}
                </span>
              ) : (
                <select
                  value={board.category}
                  onChange={(e) => board.setCategory(e.target.value as PlayCategory)}
                  className="hidden shrink-0 rounded-full border-none bg-white/10 px-2 py-0.5 text-xs font-semibold uppercase text-white/50 outline-none transition hover:bg-white/15 hover:text-white/80 sm:inline-block [&>option]:bg-zinc-900 [&>option]:normal-case"
                >
                  {PLAY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
              {viewOnly ? (
                <h1 className="truncate text-sm font-bold text-white">{board.title}</h1>
              ) : (
                <input
                  value={board.title}
                  onChange={(e) => board.setTitle(e.target.value)}
                  placeholder="Untitled move"
                  className="w-full min-w-0 truncate rounded-lg border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-bold text-white outline-none transition hover:border-white/10 hover:bg-white/5 focus:border-blue-400/50 focus:bg-white/5"
                />
              )}
              {!viewOnly && (
                <button
                  type="button"
                  onClick={() => setShowDescription((v) => !v)}
                  title="Description"
                  aria-label="Toggle description"
                  className="shrink-0 rounded-lg p-1 text-white/30 transition hover:bg-white/10 hover:text-white/70"
                >
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showDescription && 'rotate-180')} />
                </button>
              )}
            </div>
            {updatedAt && (
              <span className="hidden shrink-0 items-center gap-1.5 text-xs text-white/40 sm:inline-flex">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(updatedAt))}
              </span>
            )}
          </div>
          {!viewOnly && showDescription && (
            <textarea
              value={board.description}
              onChange={(e) => board.setDescription(e.target.value)}
              placeholder="Add a description…"
              rows={2}
              maxLength={2000}
              className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/70 placeholder:text-white/30 outline-none transition focus:border-blue-400/50"
            />
          )}
        </header>
      )}

      <TacticalBoardToolbar
        board={board}
        viewOnly={viewOnly}
        desktopViewOnly={desktopViewOnly}
        onToggleViewOnly={() => setDesktopViewOnly((v) => !v)}
        tokenSize={tokenSize}
        onTokenSizeChange={setTokenSize}
      />

      {/* Side tab — opens the save/formations panel */}
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

      <div className="flex min-h-0 flex-1 flex-col p-2 sm:p-3">
        <FrameTimeline
          frames={board.frames}
          durations={board.durations}
          activeFrameIndex={board.activeFrameIndex}
          totalDuration={board.totalDuration}
          isPlaying={board.isPlaying}
          viewOnly={viewOnly}
          onSelectFrame={(i) => { board.stopPlayback(); board.setActiveFrameIndex(i) }}
          onSetDuration={board.setDuration}
          onScrub={board.scrubTo}
          onDeleteFrame={board.deleteFrame}
        />
        <PitchCanvas board={board} gestures={gestures} viewOnly={viewOnly} tokenSize={tokenSize} />
      </div>

      {!viewOnly && (
        <PanelSlideOver
          isOpen={board.panelOpen}
          onClose={() => board.setPanelOpen(false)}
          activeTab={board.panelTab}
          onTabChange={board.setPanelTab}
          formations={board.formations}
          playbooks={board.playbooks}
          onLoadFormation={board.loadFormation}
          onOpenSaveFormation={() => {
            board.setPanelOpen(false)
            board.setShowFormationModal(true)
          }}
          title={board.title}
          setTitle={board.setTitle}
          description={board.description}
          setDescription={board.setDescription}
          category={board.category}
          setCategory={board.setCategory}
          onSaveToPlaybook={board.handleSaveToPlaybook}
          onSaveAsCopy={board.handleSaveAsCopy}
          onLoadPlay={(id) => { window.location.href = `/playbook/${id}` }}
          onExport={board.exportMove}
          isExporting={board.isExporting}
          saveStatus={board.saveStatus}
        />
      )}

      {!viewOnly && board.showFormationModal && (
        <SaveFormationModal
          board={board}
          onClose={() => board.setShowFormationModal(false)}
        />
      )}
    </section>
  )
}
