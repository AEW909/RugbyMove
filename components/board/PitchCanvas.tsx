'use client'

import { useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tokens } from '@/lib/board/defaults'
import type { useTacticalBoard } from '@/hooks/useTacticalBoard'
import type { BoardGestures } from '@/hooks/useBoardGestures'

type Board = ReturnType<typeof useTacticalBoard>

type Props = {
  board: Board
  gestures: BoardGestures
  viewOnly: boolean
}

export default function PitchCanvas({ board, gestures, viewOnly }: Props) {
  const { zoom, panX, panY, resetZoom, toBoard, snapToGrid, snapGrid, boardRef,
          selectionBox, pendingLine, boardCursor,
          handleBoardPointerDown, handleBoardPointerMove,
          handleBoardPointerUp, handleBoardPointerCancel } = gestures

  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)
  const [resizingZoneId, setResizingZoneId] = useState<string | null>(null)

  // ── Player drag ──
  const updatePlayerPosition = (id: string, clientX: number, clientY: number) => {
    let { x, y } = toBoard(clientX, clientY)
    if (snapGrid) ({ x, y } = snapToGrid(x, y))
    board.movePlayer(id, x, y)
  }

  const handlePlayerPointerDown = (id: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    updatePlayerPosition(id, e.clientX, e.clientY)
  }

  const handlePlayerPointerMove = (id: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.buttons !== 1) return
    updatePlayerPosition(id, e.clientX, e.clientY)
  }

  // ── Zone drag ──
  const handleZonePointerDown = (id: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (editingZoneId === id) return
    e.currentTarget.setPointerCapture(e.pointerId)
    e.stopPropagation()
  }

  const handleZonePointerMove = (id: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1 || editingZoneId === id) return
    const { x, y } = toBoard(e.clientX, e.clientY)
    board.moveZone(id, x, y)
  }

  // ── Pitch markings helpers ──
  const { pitchPortrait } = board
  const mainLine = (pct: string, stroke: string, sw: number, dash?: string) =>
    pitchPortrait ? (
      <line x1="0" y1={pct} x2="100%" y2={pct} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
    ) : (
      <line x1={pct} y1="0" x2={pct} y2="100%" stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
    )
  const crossLine = (pct: string, stroke: string, sw: number, dash?: string) =>
    pitchPortrait ? (
      <line x1={pct} y1="0" x2={pct} y2="100%" stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
    ) : (
      <line x1="0" y1={pct} x2="100%" y2={pct} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
    )
  const inGoalRect = (near: boolean) =>
    pitchPortrait ? (
      <rect x="0" y={near ? '0' : '91.67%'} width="100%" height="8.33%" fill="rgba(255,255,255,0.04)" />
    ) : (
      <rect x={near ? '0' : '91.67%'} y="0" width="8.33%" height="100%" fill="rgba(255,255,255,0.04)" />
    )
  const cross = (mainPct: string, crossPct: string, idx: number) => {
    const [xPct, yPct] = pitchPortrait ? [crossPct, mainPct] : [mainPct, crossPct]
    const xN = parseFloat(xPct)
    const yN = parseFloat(yPct)
    return (
      <g key={idx}>
        <line x1={`${xN - 0.7}%`} y1={yPct} x2={`${xN + 0.7}%`} y2={yPct} stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
        <line x1={xPct} y1={`${yN - 1.2}%`} x2={xPct} y2={`${yN + 1.2}%`} stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      </g>
    )
  }
  const mainLines = ['8.33%', '91.67%', '26.67%', '73.33%']
  const crossLines = ['7.14%', '92.86%', '21.43%', '78.57%']

  return (
    <div
      ref={boardRef}
      className={cn(
        'relative w-full overflow-hidden rounded-xl border border-white/10 bg-emerald-700 shadow-inner',
        boardCursor,
      )}
      style={{ aspectRatio: pitchPortrait ? '7 / 12' : '12 / 7', maxHeight: '100%' }}
      aria-label="Rugby tactical board"
      onPointerDown={handleBoardPointerDown}
      onPointerMove={handleBoardPointerMove}
      onPointerUp={handleBoardPointerUp}
      onPointerCancel={handleBoardPointerCancel}
    >
      {zoom > 1 && (
        <button
          type="button"
          onClick={resetZoom}
          className="absolute bottom-2 right-2 z-10 rounded-lg border border-white/20 bg-black/60 px-2 py-1 text-xs font-semibold text-white/70 backdrop-blur-sm transition hover:bg-black/80 hover:text-white"
        >
          {zoom.toFixed(1)}× reset
        </button>
      )}

      {/* Zoomed inner content */}
      <div
        className="absolute inset-0"
        style={{
          transform: zoom !== 1 || panX !== 0 || panY !== 0
            ? `scale(${zoom}) translate(${panX}px, ${panY}px)`
            : undefined,
          transformOrigin: 'center',
          willChange: zoom !== 1 ? 'transform' : undefined,
        }}
      >
        {/* Pitch markings */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
          {inGoalRect(true)}
          {inGoalRect(false)}
          <line x1="0" y1="0" x2="0" y2="100%" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
          <line x1="100%" y1="0" x2="100%" y2="100%" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
          <line x1="0" y1="0" x2="100%" y2="0" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
          <line x1="0" y1="100%" x2="100%" y2="100%" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
          {mainLine('8.33%', 'rgba(255,255,255,0.85)', 2)}
          {mainLine('91.67%', 'rgba(255,255,255,0.85)', 2)}
          {mainLine('26.67%', 'rgba(255,255,255,0.65)', 1)}
          {mainLine('73.33%', 'rgba(255,255,255,0.65)', 1)}
          {mainLine('41.67%', 'rgba(255,255,255,0.45)', 1, '8 6')}
          {mainLine('58.33%', 'rgba(255,255,255,0.45)', 1, '8 6')}
          {mainLine('50%', 'rgba(255,255,255,0.75)', 1.5)}
          {crossLine('7.14%', 'rgba(255,255,255,0.35)', 1, '6 8')}
          {crossLine('92.86%', 'rgba(255,255,255,0.35)', 1, '6 8')}
          {crossLine('21.43%', 'rgba(255,255,255,0.25)', 1, '6 8')}
          {crossLine('78.57%', 'rgba(255,255,255,0.25)', 1, '6 8')}
          {mainLines.flatMap((m, mi) => crossLines.map((c, ci) => cross(m, c, mi * 4 + ci)))}
          <circle cx="50%" cy="50%" r="3" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        </svg>

        {/* Lines layer */}
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
                  stroke="transparent" strokeWidth="16" strokeLinecap="round"
                  style={{ cursor: 'pointer' }}
                  onClick={() => board.deleteLine(line.id)}
                />
              )}
              <line
                x1={`${line.from.x}%`} y1={`${line.from.y}%`}
                x2={`${line.to.x}%`} y2={`${line.to.y}%`}
                stroke={line.color ?? '#f8fafc'} strokeWidth="3" strokeLinecap="round"
                strokeDasharray={line.dashed ? '8 8' : undefined}
                style={{ pointerEvents: 'none' }}
              />
            </g>
          ))}
          {pendingLine && (
            <line
              x1={`${pendingLine.from.x}%`} y1={`${pendingLine.from.y}%`}
              x2={`${pendingLine.to.x}%`} y2={`${pendingLine.to.y}%`}
              stroke={board.lineColor} strokeWidth="3" strokeLinecap="round"
              strokeDasharray={board.lineDashed ? '8 8' : undefined}
              opacity={0.55} style={{ pointerEvents: 'none' }}
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

        {/* Zones */}
        {board.visibleZones.map((zone) => {
          const canEdit = !viewOnly && board.tool !== 'draw'
          const isEditing = editingZoneId === zone.id
          return (
            <div
              key={zone.id}
              data-zone={zone.id}
              onPointerDown={canEdit && !isEditing ? handleZonePointerDown(zone.id) : undefined}
              onPointerMove={canEdit && !isEditing ? handleZonePointerMove(zone.id) : undefined}
              className={cn(
                'absolute rounded-full border-2 border-dashed border-white/40 bg-white/10',
                canEdit && !isEditing && 'touch-none cursor-move',
              )}
              style={{
                left: `${zone.x}%`, top: `${zone.y}%`,
                width: `${zone.r * 2}%`, aspectRatio: '1',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                {isEditing ? (
                  <input
                    autoFocus
                    value={zone.label}
                    onChange={(e) => board.updateZoneLabel(zone.id, e.target.value)}
                    onBlur={() => setEditingZoneId(null)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingZoneId(null) }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="w-3/4 rounded bg-black/70 px-1 py-0.5 text-center text-xs font-bold text-white outline-none"
                  />
                ) : (
                  <span className="select-none text-xs font-bold text-white/80">{zone.label}</span>
                )}
              </div>
              {canEdit && !isEditing && (
                <>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); board.deleteZone(zone.id) }}
                    className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-400"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); setEditingZoneId(zone.id) }}
                    className="absolute -left-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/40"
                  >
                    <Pencil className="h-2 w-2" />
                  </button>
                  <div
                    className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-se-resize touch-none rounded-full border border-white/60 bg-white/30 hover:bg-white/60"
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      e.currentTarget.setPointerCapture(e.pointerId)
                      setResizingZoneId(zone.id)
                    }}
                    onPointerMove={(e) => {
                      e.stopPropagation()
                      if (e.buttons !== 1 || resizingZoneId !== zone.id) return
                      const rect = boardRef.current?.getBoundingClientRect()
                      if (!rect) return
                      const cx = rect.left + (zone.x / 100) * rect.width
                      const cy = rect.top + (zone.y / 100) * rect.height
                      const distPx = Math.hypot(e.clientX - cx, e.clientY - cy)
                      board.resizeZone(zone.id, Math.min(40, Math.max(3, (distPx / rect.width) * 100)))
                    }}
                    onPointerUp={() => setResizingZoneId(null)}
                  />
                </>
              )}
            </div>
          )
        })}

        {/* Player tokens */}
        {tokens.map((token) => {
          const player = board.playerById.get(token.id)
          if (!player) return null
          if (token.side !== 'ball' && !board.activePlayers.includes(token.id)) return null
          const canDrag = !viewOnly && board.tool !== 'draw'
          return (
            <button
              type="button"
              key={token.id}
              data-player={token.id}
              onPointerDown={canDrag ? handlePlayerPointerDown(token.id) : undefined}
              onPointerMove={canDrag ? handlePlayerPointerMove(token.id) : undefined}
              className={cn(
                'absolute flex select-none items-center justify-center border-2 text-[10px] font-bold shadow-lg focus:outline-none',
                canDrag && 'touch-none transition-transform hover:scale-110 focus:ring-2 focus:ring-yellow-300',
                token.side === 'attack' && 'border-blue-100 bg-blue-600 text-white',
                token.side === 'defend' && 'border-red-100 bg-red-600 text-white',
                token.side === 'ball' && 'h-6 w-10 rounded-[50%] border-emerald-900 bg-slate-50 text-transparent',
                token.side !== 'ball' && 'h-7 w-7 rounded-full sm:h-8 sm:w-8',
                !viewOnly && board.selectedPlayerIds.has(token.id) && 'ring-2 ring-yellow-400 ring-offset-1',
              )}
              style={{
                left: `${player.x}%`, top: `${player.y}%`,
                transform: 'translate(-50%, -50%)',
                pointerEvents: canDrag ? undefined : 'none',
              }}
              aria-label={
                token.side === 'ball' ? 'Ball'
                  : `${token.side === 'attack' ? 'Attacking' : 'Defending'} player ${token.label}`
              }
            >
              {token.side === 'ball' ? (
                <>
                  <span className="absolute inset-[2px] rounded-[50%] border-t-2 border-[#e11d48]" />
                  <span className="absolute inset-[4px] rounded-[50%] border-b-2 border-[#2563eb]" />
                  <span className="absolute left-[5px] top-1/2 h-[14px] w-[4px] -translate-y-1/2 rounded-[50%] border-l-2 border-[#16a34a]" />
                  <span className="absolute right-[5px] top-1/2 h-[14px] w-[4px] -translate-y-1/2 rounded-[50%] border-r-2 border-[#16a34a]" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[6px] font-black tracking-[0.08em] text-slate-900">G</span>
                </>
              ) : token.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
