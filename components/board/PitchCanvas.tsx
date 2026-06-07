'use client'

import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UseTacticalBoardReturn } from '@/hooks/useTacticalBoard'
import { tokens } from '@/hooks/useTacticalBoard'
import type { UseBoardGesturesReturn } from '@/hooks/useBoardGestures'

// Pixel dimensions for each size tier (applied as inline styles to counter zoom-scale)
const TOKEN_PX = {
  sm: { player: 20, fontSize: 8,  ball: { w: 30, h: 14 } },
  md: { player: 28, fontSize: 10, ball: { w: 38, h: 18 } },
  lg: { player: 36, fontSize: 13, ball: { w: 48, h: 22 } },
}

type Props = {
  board: UseTacticalBoardReturn
  gestures: UseBoardGesturesReturn
  viewOnly: boolean
  tokenSize?: 'sm' | 'md' | 'lg'
}

export default function PitchCanvas({ board, gestures, viewOnly, tokenSize = 'md' }: Props) {
  const sizes = TOKEN_PX[tokenSize]
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)
  // Offset from pointer to zone centre, so drag doesn't snap the centre to the cursor.
  const zoneDragOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 })

  const { boardRef, zoom, panX, panY, resetZoom, toBoard, updatePlayerPosition,
          selectionBox, pendingLine, boardCursor,
          handleBoardPointerDown, handleBoardPointerMove,
          handleBoardPointerUp, handleBoardPointerCancel } = gestures

  const handleZonePointerDown = (id: string, zone: { x: number; y: number }) =>
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (editingZoneId === id) return
      e.currentTarget.setPointerCapture(e.pointerId)
      e.stopPropagation()
      board.markUndoCheckpoint()
      const el = boardRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const cx = (e.clientX - r.left) / r.width * 100
      const cy = (e.clientY - r.top) / r.height * 100
      zoneDragOffset.current = { dx: zone.x - cx, dy: zone.y - cy }
    }

  // Use raw (unclamped) coords for zone moves so zones can reach pitch edges freely.
  const handleZonePointerMove = (id: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1 || editingZoneId === id) return
    e.stopPropagation()
    const el = boardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width * 100
    const y = (e.clientY - r.top) / r.height * 100
    board.moveZone(id, x + zoneDragOffset.current.dx, y + zoneDragOffset.current.dy)
  }

  // Resize handle: drag distance from zone centre sets new radius.
  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    e.stopPropagation()
    board.markUndoCheckpoint()
  }

  const handleResizePointerMove = (id: string, zone: { x: number; y: number }) =>
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.buttons !== 1) return
      e.stopPropagation()
      const el = boardRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const aspect = rect.width / rect.height
      const cx = (e.clientX - rect.left) / rect.width * 100
      const cy = (e.clientY - rect.top) / rect.height * 100
      const dx = cx - zone.x
      const dy = cy - zone.y
      // Correct for non-square pitch: normalise dy to x-axis before computing distance.
      const dist = Math.sqrt(dx * dx + (dy * aspect) * (dy * aspect)) / aspect
      board.updateZoneRadius(id, dist)
    }

  const handlePlayerPointerDown = (id: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    board.markUndoCheckpoint()
    updatePlayerPosition(id, e.clientX, e.clientY)
  }

  const handlePlayerPointerMove = (id: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.buttons !== 1) return
    updatePlayerPosition(id, e.clientX, e.clientY)
  }

  const ratio = board.pitchPortrait ? '7 / 12' : '12 / 7'
  // Contained width at zoom=1 — aspect-ratio contain relative to the container.
  const containedW = board.pitchPortrait
    ? 'min(100cqw, calc(100cqh * 7 / 12))'
    : 'min(100cqw, calc(100cqh * 12 / 7))'
  // Pitch div grows freely with zoom — NO cqw cap so it can overflow and clip.
  // The outer container's overflow:hidden is the clipping boundary.
  const pitchWidth = `calc((${containedW}) * ${zoom})`

  return (
    <div
      className="min-h-0 flex-1 overflow-hidden ring-1 ring-yellow-400/40"
      style={{ display: 'grid', placeItems: 'center', containerType: 'size' }}
    >
      <div
        ref={boardRef}
        style={{
          aspectRatio: ratio,
          width: pitchWidth,
          transform: panX !== 0 || panY !== 0 ? `translate(${panX}px, ${panY}px)` : undefined,
        }}
        className={cn(
          'relative overflow-hidden rounded-xl border border-white/10 bg-emerald-700 shadow-inner',
          boardCursor,
        )}
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

        {/* Inner content — no transform; zoom/pan applied to outer pitch div */}
        <div className="absolute inset-0">
          {/* Pitch markings SVG */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
            {(() => {
              const p = board.pitchPortrait
              const mainLine = (pct: string, stroke: string, sw: number, dash?: string) =>
                p ? (
                  <line x1="0" y1={pct} x2="100%" y2={pct} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
                ) : (
                  <line x1={pct} y1="0" x2={pct} y2="100%" stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
                )
              const crossLine = (pct: string, stroke: string, sw: number, dash?: string) =>
                p ? (
                  <line x1={pct} y1="0" x2={pct} y2="100%" stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
                ) : (
                  <line x1="0" y1={pct} x2="100%" y2={pct} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
                )
              const inGoalRect = (near: boolean) =>
                p ? (
                  <rect x="0" y={near ? '0' : '91.67%'} width="100%" height="8.33%" fill="rgba(255,255,255,0.04)" />
                ) : (
                  <rect x={near ? '0' : '91.67%'} y="0" width="8.33%" height="100%" fill="rgba(255,255,255,0.04)" />
                )
              const cross = (mainPct: string, crossPct: string, idx: number) => {
                const [xPct, yPct] = p ? [crossPct, mainPct] : [mainPct, crossPct]
                const xN = parseFloat(xPct)
                const yN = parseFloat(yPct)
                return (
                  <g key={idx}>
                    <line x1={`${xN - 0.7}%`} y1={yPct} x2={`${xN + 0.7}%`} y2={yPct} stroke="rgba(255,255,255,0.65)" strokeWidth="2" />
                    <line x1={xPct} y1={`${yN - 1.2}%`} x2={xPct} y2={`${yN + 1.2}%`} stroke="rgba(255,255,255,0.65)" strokeWidth="2" />
                  </g>
                )
              }
              const mainLines = ['8.33%', '91.67%', '26.67%', '73.33%']
              const crossLines = ['7.14%', '92.86%', '21.43%', '78.57%']
              return (
                <>
                  {inGoalRect(true)}
                  {inGoalRect(false)}
                  <line x1="0" y1="0" x2="0" y2="100%" stroke="rgba(255,255,255,0.8)" strokeWidth="3" />
                  <line x1="100%" y1="0" x2="100%" y2="100%" stroke="rgba(255,255,255,0.8)" strokeWidth="3" />
                  <line x1="0" y1="0" x2="100%" y2="0" stroke="rgba(255,255,255,0.8)" strokeWidth="3" />
                  <line x1="0" y1="100%" x2="100%" y2="100%" stroke="rgba(255,255,255,0.8)" strokeWidth="3" />
                  {mainLine('8.33%', 'rgba(255,255,255,0.9)', 3)}
                  {mainLine('91.67%', 'rgba(255,255,255,0.9)', 3)}
                  {mainLine('26.67%', 'rgba(255,255,255,0.75)', 2)}
                  {mainLine('73.33%', 'rgba(255,255,255,0.75)', 2)}
                  {mainLine('41.67%', 'rgba(255,255,255,0.55)', 1.5, '8 6')}
                  {mainLine('58.33%', 'rgba(255,255,255,0.55)', 1.5, '8 6')}
                  {mainLine('50%', 'rgba(255,255,255,0.85)', 2.5)}
                  {crossLine('7.14%', 'rgba(255,255,255,0.45)', 1.5, '6 8')}
                  {crossLine('92.86%', 'rgba(255,255,255,0.45)', 1.5, '6 8')}
                  {crossLine('21.43%', 'rgba(255,255,255,0.35)', 1.5, '6 8')}
                  {crossLine('78.57%', 'rgba(255,255,255,0.35)', 1.5, '6 8')}
                  {mainLines.flatMap((m, mi) => crossLines.map((c, ci) => cross(m, c, mi * 4 + ci)))}
                  <circle cx="50%" cy="50%" r="4" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
                </>
              )
            })()}
          </svg>

          {/* Lines SVG */}
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

          {/* Zone circles */}
          {board.visibleZones.map((zone) => {
            const canEdit = !viewOnly && board.tool !== 'draw'
            return (
              <div
                key={zone.id}
                data-zone={zone.id}
                onPointerDown={canEdit ? handleZonePointerDown(zone.id, zone) : undefined}
                onPointerMove={canEdit ? handleZonePointerMove(zone.id) : undefined}
                className={cn(
                  'absolute rounded-full border-2 border-dashed border-white/40 bg-white/10',
                  canEdit && editingZoneId !== zone.id && 'touch-none cursor-move',
                )}
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.r * 2}%`,
                  aspectRatio: '1',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  {editingZoneId === zone.id ? (
                    <input
                      autoFocus
                      value={zone.label}
                      onChange={(e) => board.updateZoneLabel(zone.id, e.target.value)}
                      onBlur={() => setEditingZoneId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') setEditingZoneId(null)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-3/4 rounded bg-black/70 px-1 py-0.5 text-center text-xs font-bold text-white outline-none"
                    />
                  ) : (
                    <span
                      className="select-none text-xs font-bold text-white/80"
                      onDoubleClick={(e) => { if (canEdit) { e.stopPropagation(); setEditingZoneId(zone.id) } }}
                    >
                      {zone.label}
                    </span>
                  )}
                </div>
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); board.deleteZone(zone.id) }}
                      className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-400"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                    {/* Resize handle — right edge of circle (3 o'clock), distance = r from centre */}
                    <div
                      title="Drag to resize"
                      onPointerDown={handleResizePointerDown}
                      onPointerMove={handleResizePointerMove(zone.id, zone)}
                      className="absolute top-1/2 right-0 h-3.5 w-3.5 -translate-y-1/2 translate-x-1/2 cursor-ew-resize rounded-full border border-white/60 bg-white/30 touch-none hover:bg-white/60"
                    />
                  </>
                )}
              </div>
            )
          })}

          {/* Player tokens — fixed px size; % position scales with pitch div */}
          {tokens.map((token) => {
            const player = board.playerById.get(token.id)
            if (!player) return null
            if (token.side !== 'ball' && !board.activePlayers.includes(token.id)) return null
            const canDrag = !viewOnly && board.tool !== 'draw'
            const isBall = token.side === 'ball'
            return (
              <button
                type="button"
                key={token.id}
                data-player={token.id}
                onPointerDown={canDrag ? handlePlayerPointerDown(token.id) : undefined}
                onPointerMove={canDrag ? handlePlayerPointerMove(token.id) : undefined}
                className={cn(
                  'absolute flex select-none items-center justify-center border-2 font-bold shadow-lg focus:outline-none',
                  canDrag && 'touch-none hover:brightness-110 focus:ring-2 focus:ring-yellow-300',
                  token.side === 'attack' && 'rounded-full border-blue-100 bg-blue-600 text-white',
                  token.side === 'defend' && 'rounded-full border-red-100 bg-red-600 text-white',
                  isBall && 'rounded-[50%] border-emerald-900 bg-slate-50 text-transparent',
                  !viewOnly && board.selectedPlayerIds.has(token.id) && 'ring-2 ring-yellow-400 ring-offset-1',
                )}
                style={{
                  left: `${player.x}%`,
                  top: `${player.y}%`,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: canDrag ? undefined : 'none',
                  width: isBall ? sizes.ball.w : sizes.player,
                  height: isBall ? sizes.ball.h : sizes.player,
                  fontSize: isBall ? 0 : sizes.fontSize,
                }}
                aria-label={isBall ? 'Ball' : `${token.side === 'attack' ? 'Attacking' : 'Defending'} player ${token.label}`}
              >
                {isBall ? (
                  <>
                    <span className="absolute inset-[2px] rounded-[50%] border-t-2 border-[#e11d48]" />
                    <span className="absolute inset-[4px] rounded-[50%] border-b-2 border-[#2563eb]" />
                    <span className="absolute left-[5px] top-1/2 h-[10px] w-[3px] -translate-y-1/2 rounded-[50%] border-l-2 border-[#16a34a]" />
                    <span className="absolute right-[5px] top-1/2 h-[10px] w-[3px] -translate-y-1/2 rounded-[50%] border-r-2 border-[#16a34a]" />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[5px] font-black tracking-[0.08em] text-slate-900">
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
    </div>
  )
}
