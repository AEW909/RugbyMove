'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { PlayerPosition, Line } from '@/types/play'

const MAX_ZOOM = 4
const ZOOM_FACTOR = 1.15
const MIN_LINE_LENGTH_PCT = 2

export type BoardGestureConfig = {
  tool: 'pointer' | 'select' | 'draw'
  viewOnly: boolean
  snapGrid: boolean
  activeFramePlayers: PlayerPosition[]
  setSelectedPlayerIds: Dispatch<SetStateAction<Set<string>>>
  lineColor: string
  lineDashed: boolean
  onAddLine: (line: Line) => void
  onMovePlayer: (id: string, x: number, y: number) => void
}

export type UseBoardGesturesReturn = {
  boardRef: React.RefObject<HTMLDivElement>
  zoom: number
  panX: number
  panY: number
  resetZoom: () => void
  toBoard: (clientX: number, clientY: number) => { x: number; y: number }
  updatePlayerPosition: (id: string, clientX: number, clientY: number) => void
  selectionBox: { x1: number; y1: number; x2: number; y2: number } | null
  pendingLine: { from: { x: number; y: number }; to: { x: number; y: number } } | null
  boardCursor: string
  handleBoardPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
  handleBoardPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void
  handleBoardPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void
  handleBoardPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void
}

export function useBoardGestures({
  tool,
  viewOnly,
  snapGrid,
  activeFramePlayers,
  setSelectedPlayerIds,
  lineColor,
  lineDashed,
  onAddLine,
  onMovePlayer,
}: BoardGestureConfig): UseBoardGesturesReturn {
  const boardRef = useRef<HTMLDivElement>(null)

  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)

  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const panStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number } | null>(null)
  const pinchStartRef = useRef<{ dist: number; startZoom: number; startPanX: number; startPanY: number } | null>(null)
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null)
  const drawStartRef = useRef<{ x: number; y: number } | null>(null)

  const [selectionBox, setSelectionBox] = useState<{
    x1: number; y1: number; x2: number; y2: number
  } | null>(null)
  const [pendingLine, setPendingLine] = useState<{
    from: { x: number; y: number }; to: { x: number; y: number }
  } | null>(null)

  const clampPan = (px: number, py: number, z: number, r: DOMRect) => ({
    x: Math.min(r.width  / 2 * (z - 1) / z, Math.max(-r.width  / 2 * (z - 1) / z, px)),
    y: Math.min(r.height / 2 * (z - 1) / z, Math.max(-r.height / 2 * (z - 1) / z, py)),
  })

  const resetZoom = () => { setZoom(1); setPanX(0); setPanY(0) }

  const toBoard = useCallback((clientX: number, clientY: number) => {
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
  }, [zoom, panX, panY])

  const updatePlayerPosition = useCallback((id: string, clientX: number, clientY: number) => {
    let { x, y } = toBoard(clientX, clientY)
    if (snapGrid) {
      const r = boardRef.current?.getBoundingClientRect()
      const gridX = 5
      const gridY = r ? gridX * (r.width / r.height) : gridX
      x = Math.round(x / gridX) * gridX
      y = Math.round(y / gridY) * gridY
    }
    onMovePlayer(id, x, y)
  }, [toBoard, snapGrid, onMovePlayer])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const r = boardRef.current?.getBoundingClientRect()
    if (!r) return
    const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
    const newZoom = Math.min(MAX_ZOOM, Math.max(1, zoom * factor))
    if (newZoom === zoom) return
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

  const handleBoardPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as Element
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointersRef.current.size >= 2) {
      const pts = Array.from(activePointersRef.current.values())
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      pinchStartRef.current = { dist, startZoom: zoom, startPanX: panX, startPanY: panY }
      panStartRef.current = null
      return
    }

    if (zoom > 1 && !target.closest('[data-player]') && (viewOnly || tool === 'pointer')) {
      e.currentTarget.setPointerCapture(e.pointerId)
      panStartRef.current = { x: e.clientX, y: e.clientY, startPanX: panX, startPanY: panY }
      return
    }

    if (viewOnly) return

    if (tool === 'select') {
      if (target.closest('[data-player]')) return
      e.currentTarget.setPointerCapture(e.pointerId)
      const { x, y } = toBoard(e.clientX, e.clientY)
      selectionStartRef.current = { x, y }
      setSelectionBox({ x1: x, y1: y, x2: x, y2: y })
      setSelectedPlayerIds(new Set())
      return
    }

    if (tool === 'draw') {
      if (target.tagName.toLowerCase() === 'line') return
      e.currentTarget.setPointerCapture(e.pointerId)
      const { x, y } = toBoard(e.clientX, e.clientY)
      drawStartRef.current = { x, y }
      setPendingLine({ from: { x, y }, to: { x, y } })
    }
  }, [zoom, panX, panY, viewOnly, tool, toBoard, setSelectedPlayerIds])

  const handleBoardPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

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

    if (tool === 'select' && selectionStartRef.current) {
      const { x, y } = toBoard(e.clientX, e.clientY)
      setSelectionBox({ x1: selectionStartRef.current.x, y1: selectionStartRef.current.y, x2: x, y2: y })
      return
    }

    if (tool === 'draw' && drawStartRef.current) {
      const { x, y } = toBoard(e.clientX, e.clientY)
      setPendingLine({ from: drawStartRef.current, to: { x, y } })
    }
  }, [zoom, tool, toBoard])

  const handleBoardPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
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

    if (tool === 'select' && selectionStartRef.current) {
      const { x, y } = toBoard(e.clientX, e.clientY)
      const minX = Math.min(selectionStartRef.current.x, x)
      const minY = Math.min(selectionStartRef.current.y, y)
      const maxX = Math.max(selectionStartRef.current.x, x)
      const maxY = Math.max(selectionStartRef.current.y, y)
      setSelectedPlayerIds(
        new Set(
          activeFramePlayers
            .filter((p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY)
            .map((p) => p.id),
        ),
      )
      selectionStartRef.current = null
      setSelectionBox(null)
      return
    }

    if (tool === 'draw' && drawStartRef.current && pendingLine) {
      const dx = pendingLine.to.x - pendingLine.from.x
      const dy = pendingLine.to.y - pendingLine.from.y
      if (Math.sqrt(dx * dx + dy * dy) >= MIN_LINE_LENGTH_PCT) {
        const line: Line = {
          id: crypto.randomUUID(),
          from: pendingLine.from,
          to: pendingLine.to,
          color: lineColor,
          dashed: lineDashed,
        }
        onAddLine(line)
      }
      drawStartRef.current = null
      setPendingLine(null)
    }
  }, [viewOnly, tool, toBoard, activeFramePlayers, setSelectedPlayerIds, pendingLine, lineColor, lineDashed, onAddLine])

  const handleBoardPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId)
    panStartRef.current = null
    if (activePointersRef.current.size < 2) pinchStartRef.current = null
  }, [])

  const boardCursor = (() => {
    if (panStartRef.current) return 'cursor-grabbing'
    if (zoom > 1 && (viewOnly || tool === 'pointer')) return 'cursor-grab'
    if (!viewOnly && (tool === 'select' || tool === 'draw')) return 'cursor-crosshair'
    return ''
  })()

  return {
    boardRef,
    zoom,
    panX,
    panY,
    resetZoom,
    toBoard,
    updatePlayerPosition,
    selectionBox,
    pendingLine,
    boardCursor,
    handleBoardPointerDown,
    handleBoardPointerMove,
    handleBoardPointerUp,
    handleBoardPointerCancel,
  }
}
