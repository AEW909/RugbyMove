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
  pitchPortrait: boolean
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

// Compute expected pitch pixel dimensions for a given zoom level.
function computePitchSize(zoom: number, cW: number, cH: number, portrait: boolean) {
  const ratio = portrait ? 7 / 12 : 12 / 7
  const containedW = Math.min(cW, cH * ratio)
  const pitchW = Math.min(cW, containedW * zoom)
  const pitchH = pitchW / ratio
  return { pitchW, pitchH }
}

// Clamp pan so the pitch never drifts beyond the container edges.
function clampPan(px: number, py: number, pitchW: number, pitchH: number, cW: number, cH: number) {
  const maxX = Math.max(0, (pitchW - cW) / 2)
  const maxY = Math.max(0, (pitchH - cH) / 2)
  return {
    x: Math.min(maxX, Math.max(-maxX, px)),
    y: Math.min(maxY, Math.max(-maxY, py)),
  }
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
  pitchPortrait,
}: BoardGestureConfig): UseBoardGesturesReturn {
  const boardRef = useRef<HTMLDivElement>(null)

  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)

  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const panStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number } | null>(null)
  const pinchStartRef = useRef<{
    dist: number
    startZoom: number
    pitchBx: number
    pitchBy: number
    midClientX: number
    midClientY: number
    containerLeft: number
    containerTop: number
    containerW: number
    containerH: number
  } | null>(null)
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null)
  const drawStartRef = useRef<{ x: number; y: number } | null>(null)

  const [selectionBox, setSelectionBox] = useState<{
    x1: number; y1: number; x2: number; y2: number
  } | null>(null)
  const [pendingLine, setPendingLine] = useState<{
    from: { x: number; y: number }; to: { x: number; y: number }
  } | null>(null)

  const resetZoom = () => { setZoom(1); setPanX(0); setPanY(0) }

  // Zoom is expressed as pitch div size — no internal transform — so toBoard
  // is just a direct mapping from screen coords to pitch percentage.
  const toBoard = useCallback((clientX: number, clientY: number) => {
    const el = boardRef.current
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    return {
      x: Math.min(100, Math.max(0, (clientX - r.left) / r.width * 100)),
      y: Math.min(100, Math.max(0, (clientY - r.top) / r.height * 100)),
    }
  }, [])

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

  // pitchPortrait ref so wheel handler can always read latest value without
  // re-registering the event listener.
  const pitchPortraitRef = useRef(pitchPortrait)
  useEffect(() => { pitchPortraitRef.current = pitchPortrait }, [pitchPortrait])

  const zoomRef = useRef(zoom)
  const panXRef = useRef(panX)
  const panYRef = useRef(panY)
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panXRef.current = panX }, [panX])
  useEffect(() => { panYRef.current = panY }, [panY])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const el = boardRef.current
    if (!el) return
    const containerEl = el.parentElement
    if (!containerEl) return

    const boardRect = el.getBoundingClientRect()
    const cRect = containerEl.getBoundingClientRect()
    const zoom = zoomRef.current
    const panX = panXRef.current
    const panY = panYRef.current
    const portrait = pitchPortraitRef.current

    const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
    const newZoom = Math.min(MAX_ZOOM, Math.max(1, zoom * factor))
    if (newZoom === zoom) return

    const { pitchW: pitchW_new, pitchH: pitchH_new } = computePitchSize(
      newZoom, cRect.width, cRect.height, portrait,
    )

    // Fraction of the current pitch where the cursor sits
    const pitchBx = (e.clientX - boardRect.left) / boardRect.width
    const pitchBy = (e.clientY - boardRect.top) / boardRect.height

    // Pan to keep that pitch point under the cursor after resize.
    // New pitch is centred at (containerLeft + cW/2 + panX_new, ...)
    // pitchLeft_new = containerLeft + (cW - pitchW_new)/2 + panX_new
    // We want: pitchLeft_new + pitchBx * pitchW_new = e.clientX
    const rawPanX = e.clientX - cRect.left - (cRect.width - pitchW_new) / 2 - pitchBx * pitchW_new
    const rawPanY = e.clientY - cRect.top - (cRect.height - pitchH_new) / 2 - pitchBy * pitchH_new

    const clamped = clampPan(rawPanX, rawPanY, pitchW_new, pitchH_new, cRect.width, cRect.height)
    setZoom(newZoom)
    setPanX(clamped.x)
    setPanY(clamped.y)

    void panX; void panY // suppress unused-var lint
  }, [])

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
      const el = boardRef.current
      if (!el) return
      const boardRect = el.getBoundingClientRect()
      const containerEl = el.parentElement
      const cRect = containerEl?.getBoundingClientRect()
      const pts = Array.from(activePointersRef.current.values())
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const midClientX = (pts[0].x + pts[1].x) / 2
      const midClientY = (pts[0].y + pts[1].y) / 2
      pinchStartRef.current = {
        dist,
        startZoom: zoomRef.current,
        pitchBx: (midClientX - boardRect.left) / boardRect.width,
        pitchBy: (midClientY - boardRect.top) / boardRect.height,
        midClientX,
        midClientY,
        containerLeft: cRect?.left ?? 0,
        containerTop: cRect?.top ?? 0,
        containerW: cRect?.width ?? boardRect.width,
        containerH: cRect?.height ?? boardRect.height,
      }
      panStartRef.current = null
      return
    }

    if (zoomRef.current > 1 && !target.closest('[data-player]') && (viewOnly || tool === 'pointer')) {
      e.currentTarget.setPointerCapture(e.pointerId)
      panStartRef.current = { x: e.clientX, y: e.clientY, startPanX: panXRef.current, startPanY: panYRef.current }
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
  }, [viewOnly, tool, toBoard, setSelectedPlayerIds])

  const handleBoardPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pinchStartRef.current && activePointersRef.current.size >= 2) {
      const pts = Array.from(activePointersRef.current.values())
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const p = pinchStartRef.current
      const newZoom = Math.min(MAX_ZOOM, Math.max(1, p.startZoom * dist / p.dist))
      const { pitchW: pitchW_new, pitchH: pitchH_new } = computePitchSize(
        newZoom, p.containerW, p.containerH, pitchPortraitRef.current,
      )
      const newMidX = (pts[0].x + pts[1].x) / 2
      const newMidY = (pts[0].y + pts[1].y) / 2
      const rawPanX = newMidX - p.containerLeft - (p.containerW - pitchW_new) / 2 - p.pitchBx * pitchW_new
      const rawPanY = newMidY - p.containerTop - (p.containerH - pitchH_new) / 2 - p.pitchBy * pitchH_new
      const clamped = clampPan(rawPanX, rawPanY, pitchW_new, pitchH_new, p.containerW, p.containerH)
      setZoom(newZoom)
      setPanX(clamped.x)
      setPanY(clamped.y)
      return
    }

    if (panStartRef.current && e.buttons === 1) {
      const el = boardRef.current
      if (!el) return
      const boardRect = el.getBoundingClientRect()
      const containerEl = el.parentElement
      const cRect = containerEl?.getBoundingClientRect()
      const cW = cRect?.width ?? boardRect.width
      const cH = cRect?.height ?? boardRect.height
      const rawPanX = panStartRef.current.startPanX + (e.clientX - panStartRef.current.x)
      const rawPanY = panStartRef.current.startPanY + (e.clientY - panStartRef.current.y)
      const clamped = clampPan(rawPanX, rawPanY, boardRect.width, boardRect.height, cW, cH)
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
  }, [tool, toBoard])

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
