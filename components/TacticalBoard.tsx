'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
  RotateCw,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FormationCategory } from '@/lib/board/storage'
import { useTacticalBoard, tokens, SCRUM_FORMATION, LINEOUT_FORMATION } from '@/hooks/useTacticalBoard'
import type { TacticalBoardProps } from '@/hooks/useTacticalBoard'
import PanelSlideOver from '@/components/board/PanelSlideOver'
import FrameTimeline from '@/components/board/FrameTimeline'
import type { Line } from '@/types/play'
import { useIsMobile } from '@/hooks/useIsMobile'

const LINE_COLORS = [
  { value: '#f8fafc', label: 'White' },
  { value: '#ef4444', label: 'Red' },
  { value: '#facc15', label: 'Yellow' },
  { value: '#60a5fa', label: 'Blue' },
]

const MIN_LINE_LENGTH_PCT = 2
const MAX_ZOOM = 4
const ZOOM_FACTOR = 1.15

export default function TacticalBoard(props: TacticalBoardProps) {
  const board = useTacticalBoard(props)
  const boardRef = useRef<HTMLDivElement>(null)

  // ── Edit state ──
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null)
  const [selectionBox, setSelectionBox] = useState<{
    x1: number; y1: number; x2: number; y2: number
  } | null>(null)
  const drawStartRef = useRef<{ x: number; y: number } | null>(null)
  const [pendingLine, setPendingLine] = useState<{
    from: { x: number; y: number }; to: { x: number; y: number }
  } | null>(null)

  // ── UI toggles ──
  const isMobile = useIsMobile()
  const { playTitle = 'Untitled move', viewOnly: viewOnlyProp = false } = props
  const [desktopViewOnly, setDesktopViewOnly] = useState(false)
  const [pitchPortrait, setPitchPortrait] = useState(false)
  const viewOnly = viewOnlyProp || isMobile || desktopViewOnly

  // ── Zoom / pan state ──
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0) // screen pixels
  const [panY, setPanY] = useState(0) // screen pixels

  // Gesture tracking refs (pointer id → position)
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const panStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number } | null>(null)
  const pinchStartRef = useRef<{ dist: number; startZoom: number; startPanX: number; startPanY: number } | null>(null)

  // With transform: scale(zoom) translate(panX, panY), visual movement = panX * zoom.
  // Clamp so content edge never shows empty space:
  //   left edge at screen: cx*(1-zoom) + panX*zoom ≤ 0  →  panX ≤ cx*(zoom-1)/zoom
  const clampPan = (px: number, py: number, z: number, r: DOMRect) => ({
    x: Math.min(r.width  / 2 * (z - 1) / z, Math.max(-r.width  / 2 * (z - 1) / z, px)),
    y: Math.min(r.height / 2 * (z - 1) / z, Math.max(-r.height / 2 * (z - 1) / z, py)),
  })

  const resetZoom = () => { setZoom(1); setPanX(0); setPanY(0) }

  // ── Coordinate mapping (accounts for zoom + pan) ──
  // transform: scale(zoom) translate(panX px, panY px) with origin center
  // Combined: screenX = cx + (localX - cx + panX) * zoom
  // Inverse:  localX = (screenX - cx) / zoom + cx - panX
  const toBoard = (clientX: number, clientY: number) => {
    const el = boardRef.current
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    const cx = r.width / 2
    const cy = r.height / 2
    const lx = (clientX - r.left - cx) / zoom + cx - panX
    const ly = (clientY - r.top - cy) / zoom + cy - panY
    return {
      x: Math.min(100, Math.max(0, (lx / r.width) * 100)),
      y: Math.min(100, Math.max(0, (ly / r.height) * 100)),
    }
  }

  // ── Player drag ──
  const updatePlayerPosition = (id: string, clientX: number, clientY: number) => {
    const { x, y } = toBoard(clientX, clientY)
    board.movePlayer(id, x, y)
  }

  const handlePointerDown = (id: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    updatePlayerPosition(id, e.clientX, e.clientY)
  }

  const handlePointerMove = (id: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.buttons !== 1) return
    updatePlayerPosition(id, e.clientX, e.clientY)
  }

  // ── Scroll-wheel zoom ──
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const r = boardRef.current?.getBoundingClientRect()
    if (!r) return
    const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
    const newZoom = Math.min(MAX_ZOOM, Math.max(1, zoom * factor))
    if (newZoom === zoom) return
    // Zoom toward cursor — keep local point under cursor fixed:
    //   localX = (dx)/zoom + cx - panX  →  newPanX = panX + dx*(1/newZoom - 1/zoom)
    const dx = e.clientX - r.left - r.width / 2
    const dy = e.clientY - r.top - r.height / 2
    const rawPanX = panX + dx * (1 / newZoom - 1 / zoom)
    const rawPanY = panY + dy * (1 / newZoom - 1 / zoom)
    const clamped = clampPan(rawPanX, rawPanY, newZoom, r)
    setZoom(newZoom)
    setPanX(clamped.x)
    setPanY(clamped.y)
  }, [zoom, panX, panY])

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // ── Board pointer handlers ──
  const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as Element
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // ── Pinch: two fingers ──
    if (activePointersRef.current.size >= 2) {
      const pts = Array.from(activePointersRef.current.values())
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      pinchStartRef.current = { dist, startZoom: zoom, startPanX: panX, startPanY: panY }
      panStartRef.current = null
      return
    }

    // ── Pan: zoom > 1 + pointer tool or view-only + not on a player ──
    if (zoom > 1 && !target.closest('[data-player]') && (viewOnly || board.tool === 'pointer')) {
      e.currentTarget.setPointerCapture(e.pointerId)
      panStartRef.current = { x: e.clientX, y: e.clientY, startPanX: panX, startPanY: panY }
      return
    }

    if (viewOnly) return

    // ── Select tool ──
    if (board.tool === 'select') {
      if (target.closest('[data-player]')) return
      e.currentTarget.setPointerCapture(e.pointerId)
      const { x, y } = toBoard(e.clientX, e.clientY)
      selectionStartRef.current = { x, y }
      setSelectionBox({ x1: x, y1: y, x2: x, y2: y })
      board.setSelectedPlayerIds(new Set())
      return
    }

    // ── Draw tool ──
    if (board.tool === 'draw') {
      if (target.tagName.toLowerCase() === 'line') return
      e.currentTarget.setPointerCapture(e.pointerId)
      const { x, y } = toBoard(e.clientX, e.clientY)
      drawStartRef.current = { x, y }
      setPendingLine({ from: { x, y }, to: { x, y } })
    }
  }

  const handleBoardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // ── Pinch ──
    if (pinchStartRef.current && activePointersRef.current.size >= 2) {
      const pts = Array.from(activePointersRef.current.values())
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const { startZoom, startPanX, startPanY } = pinchStartRef.current
      const newZoom = Math.min(MAX_ZOOM, Math.max(1, startZoom * dist / pinchStartRef.current.dist))
      const el = boardRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const midX = (pts[0].x + pts[1].x) / 2 - r.left - r.width / 2
      const midY = (pts[0].y + pts[1].y) / 2 - r.top - r.height / 2
      const rawPanX = startPanX + midX * (1 / newZoom - 1 / startZoom)
      const rawPanY = startPanY + midY * (1 / newZoom - 1 / startZoom)
      const clamped = clampPan(rawPanX, rawPanY, newZoom, r)
      setZoom(newZoom)
      setPanX(clamped.x)
      setPanY(clamped.y)
      return
    }

    // ── Pan ──
    if (panStartRef.current && e.buttons === 1) {
      const el = boardRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const rawPanX = panStartRef.current.startPanX + (e.clientX - panStartRef.current.x)
      const rawPanY = panStartRef.current.startPanY + (e.clientY - panStartRef.current.y)
      const clamped = clampPan(rawPanX, rawPanY, zoom, r)
      setPanX(clamped.x)
      setPanY(clamped.y)
      return
    }

    if (e.buttons !== 1) return

    // ── Select drag ──
    if (board.tool === 'select' && selectionStartRef.current) {
      const { x, y } = toBoard(e.clientX, e.clientY)
      setSelectionBox({ x1: selectionStartRef.current.x, y1: selectionStartRef.current.y, x2: x, y2: y })
      return
    }

    // ── Draw drag ──
    if (board.tool === 'draw' && drawStartRef.current) {
      const { x, y } = toBoard(e.clientX, e.clientY)
      setPendingLine({ from: drawStartRef.current, to: { x, y } })
    }
  }

  const handleBoardPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId)

    if (panStartRef.current) {
      panStartRef.current = null
      return
    }
    if (pinchStartRef.current) {
      if (activePointersRef.current.size < 2) pinchStartRef.current = null
      return
    }

    if (viewOnly) return

    // ── Select finalize ──
    if (board.tool === 'select' && selectionStartRef.current) {
      const { x, y } = toBoard(e.clientX, e.clientY)
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

    // ── Draw finalize ──
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

  const handleBoardPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId)
    panStartRef.current = null
    if (activePointersRef.current.size < 2) pinchStartRef.current = null
  }

  // Cursor style on the board
  const boardCursor = (() => {
    if (panStartRef.current) return 'cursor-grabbing'
    if (zoom > 1 && (viewOnly || board.tool === 'pointer')) return 'cursor-grab'
    if (!viewOnly && (board.tool === 'select' || board.tool === 'draw')) return 'cursor-crosshair'
    return ''
  })()

  return (
    <section className={cn('overflow-visible bg-black', !isMobile && 'rounded-xl border border-white/10 shadow-toolbar')}>
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

            <div className="h-5 w-px bg-white/10" />

            {/* View / Edit toggle */}
            <button
              type="button"
              onClick={() => setDesktopViewOnly((v) => !v)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition',
                desktopViewOnly
                  ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                  : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10',
              )}
            >
              {desktopViewOnly ? 'View' : 'Edit'}
            </button>

            {/* Pitch rotation toggle */}
            <button
              type="button"
              title="Rotate pitch"
              onClick={() => setPitchPortrait((p) => !p)}
              className={cn(
                'inline-flex items-center justify-center rounded-xl border p-2 transition',
                pitchPortrait
                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                  : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10',
              )}
            >
              <RotateCw className="h-4 w-4" />
            </button>

            {/* Draw tool colour + dashed options */}
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

        {/* Board canvas — overflow-hidden clips the zoomed inner content */}
        <div
          ref={boardRef}
          className={cn(
            'relative aspect-[12/7] w-full overflow-hidden rounded-xl border border-white/10 bg-emerald-700 shadow-inner',
            !viewOnly && 'min-h-[260px]',
            boardCursor,
          )}
          aria-label="Rugby tactical board"
          onPointerDown={handleBoardPointerDown}
          onPointerMove={handleBoardPointerMove}
          onPointerUp={handleBoardPointerUp}
          onPointerCancel={handleBoardPointerCancel}
        >
          {/* Zoom indicator — click to reset */}
          {zoom > 1 && (
            <button
              type="button"
              onClick={resetZoom}
              className="absolute bottom-2 right-2 z-10 rounded-lg border border-white/20 bg-black/60 px-2 py-1 text-xs font-semibold text-white/70 backdrop-blur-sm transition hover:bg-black/80 hover:text-white"
            >
              {zoom.toFixed(1)}× reset
            </button>
          )}

          {/* ── Zoomed inner content ── */}
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
            {/* Pitch markings SVG */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
              {(() => {
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
                  // Arms: ~0.7% of width horizontally, ~1.2% of height vertically
                  return (
                    <g key={idx}>
                      <line x1={`${xN - 0.7}%`} y1={yPct} x2={`${xN + 0.7}%`} y2={yPct} stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
                      <line x1={xPct} y1={`${yN - 1.2}%`} x2={xPct} y2={`${yN + 1.2}%`} stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
                    </g>
                  )
                }
                // Pitch border helpers
                const bx = (v: string) => pitchPortrait ? '0' : v
                const by = (v: string) => pitchPortrait ? v : '0'
                const bx2 = (v: string) => pitchPortrait ? '100%' : v
                const by2 = (v: string) => pitchPortrait ? v : '100%'
                const mainLines = ['8.33%', '91.67%', '26.67%', '73.33%']
                const crossLines = ['7.14%', '92.86%', '21.43%', '78.57%']
                return (
                  <>
                    {inGoalRect(true)}
                    {inGoalRect(false)}
                    <line x1={bx('0')} y1={by('0')} x2={bx2('0')} y2={by2('0')} stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
                    <line x1={bx('100%')} y1={by('100%')} x2={bx2('100%')} y2={by2('100%')} stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
                    <line x1={bx('0')} y1={by('100%')} x2={bx2('100%')} y2={by2('100%')} stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
                    <line x1={bx('100%')} y1={by('0')} x2={bx2('0')} y2={by2('0')} stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
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
                  </>
                )
              })()}
            </svg>

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
          </div>{/* end zoomed inner div */}
        </div>
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
          onLoadPlay={(id) => { window.location.href = `/playbook/${id}` }}
          onExport={board.exportMove}
          isExporting={board.isExporting}
          initialTitle={playTitle}
          saveStatus={board.saveStatus}
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
