'use client'

import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
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
import AddPlayersDialog from '@/components/board/AddPlayersDialog'

export default function TacticalBoard(props: TacticalBoardProps) {
  const board = useTacticalBoard(props)
  const isMobile = useIsMobile()

  const { playTitle = 'Untitled move', viewOnly: viewOnlyProp = false } = props
  const [desktopViewOnly, setDesktopViewOnly] = useState(false)
  const [showAddPlayers, setShowAddPlayers] = useState(false)
  const [tokenSize, setTokenSize] = useState<'sm' | 'md' | 'lg'>('md')
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
      <TacticalBoardToolbar
        board={board}
        viewOnly={viewOnly}
        desktopViewOnly={desktopViewOnly}
        onToggleViewOnly={() => setDesktopViewOnly((v) => !v)}
        onShowAddPlayers={() => setShowAddPlayers(true)}
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
          playCategory={props.playCategory}
          onSaveToPlaybook={board.handleSaveToPlaybook}
          onSaveAsCopy={board.handleSaveAsCopy}
          onLoadPlay={(id) => { window.location.href = `/playbook/${id}` }}
          onExport={board.exportMove}
          isExporting={board.isExporting}
          initialTitle={playTitle}
          initialDescription={props.playDescription}
          initialIsPublic={props.playIsPublic}
          saveStatus={board.saveStatus}
        />
      )}

      {!viewOnly && board.showFormationModal && (
        <SaveFormationModal
          board={board}
          onClose={() => board.setShowFormationModal(false)}
        />
      )}

      {showAddPlayers && (
        <AddPlayersDialog
          activePlayers={board.activePlayers}
          onAdd={(ids) => { board.addPlayers(ids); setShowAddPlayers(false) }}
          onClose={() => setShowAddPlayers(false)}
        />
      )}
    </section>
  )
}
