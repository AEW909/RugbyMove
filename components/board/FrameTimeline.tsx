'use client'

import { useRef, useState, useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MIN_DURATION, MAX_DURATION } from '@/lib/board/frames'
import { buildFrameStarts } from '@/lib/board/math'
import type { Frame } from '@/types/play'

type Props = {
  frames: Frame[]
  durations: number[]
  activeFrameIndex: number
  totalDuration: number
  isPlaying: boolean
  viewOnly: boolean
  onSelectFrame: (index: number) => void
  onSetDuration: (segIndex: number, ms: number) => void
  onScrub: (timeMs: number) => void
  onDeleteFrame: (index: number) => void
}


export default function FrameTimeline({
  frames,
  durations,
  activeFrameIndex,
  totalDuration,
  isPlaying,
  viewOnly,
  onSelectFrame,
  onSetDuration,
  onScrub,
  onDeleteFrame,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [draggingMarker, setDraggingMarker] = useState<number | null>(null)
  const [scrubbing, setScrubbing] = useState(false)
  const [hoveredSeg, setHoveredSeg] = useState<number | null>(null)

  const cumulative = buildFrameStarts(durations)
  const safeTotal = totalDuration > 0 ? totalDuration : 1

  const markerXPct = (frameIndex: number) =>
    ((cumulative[frameIndex] ?? 0) / safeTotal) * 100

  const playheadXPct = isPlaying
    ? markerXPct(activeFrameIndex)
    : markerXPct(activeFrameIndex)

  // Convert pointer X within track to ms
  const ptrToMs = useCallback((clientX: number): number => {
    const el = trackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return pct * safeTotal
  }, [safeTotal])

  // ── Marker drag ──
  const handleMarkerPointerDown = (e: React.PointerEvent, markerIndex: number) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDraggingMarker(markerIndex)
  }

  const handleMarkerPointerMove = (e: React.PointerEvent, markerIndex: number) => {
    if (draggingMarker !== markerIndex || e.buttons !== 1) return
    const newMs = ptrToMs(e.clientX)
    const prevMs = cumulative[markerIndex - 1] ?? 0
    const newDuration = Math.min(MAX_DURATION, Math.max(MIN_DURATION, newMs - prevMs))
    onSetDuration(markerIndex - 1, newDuration)
  }

  const handleMarkerPointerUp = () => {
    setDraggingMarker(null)
  }

  // ── Playhead / track scrub ──
  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-marker]')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setScrubbing(true)
    const ms = ptrToMs(e.clientX)
    onScrub(ms)
  }

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbing || e.buttons !== 1) return
    onScrub(ptrToMs(e.clientX))
  }

  const handleTrackPointerUp = () => setScrubbing(false)

  const showDurationLabel = (segIndex: number) => {
    if (!trackRef.current) return false
    const trackW = trackRef.current.getBoundingClientRect().width
    const segW = ((durations[segIndex] ?? 0) / safeTotal) * trackW
    return segW > 44
  }

  if (frames.length === 0) return null

  return (
    <div className="mb-3 select-none px-1">
      {/* Track area */}
      <div
        ref={trackRef}
        className={cn(
          'relative h-12 w-full touch-none',
          scrubbing ? 'cursor-grabbing' : 'cursor-pointer',
        )}
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handleTrackPointerMove}
        onPointerUp={handleTrackPointerUp}
      >
        {/* Groove */}
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/10" />

        {/* Segment fills */}
        {frames.slice(0, -1).map((_, i) => (
          <div
            key={i}
            className={cn(
              'absolute top-1/2 h-1 -translate-y-1/2 rounded-full transition-colors',
              i === activeFrameIndex
                ? 'bg-blue-500/60'
                : 'bg-white/20',
            )}
            style={{
              left: `${markerXPct(i)}%`,
              width: `${markerXPct(i + 1) - markerXPct(i)}%`,
            }}
            onMouseEnter={() => setHoveredSeg(i)}
            onMouseLeave={() => setHoveredSeg(null)}
          />
        ))}

        {/* Duration labels (centred in each segment, only if wide enough) */}
        {frames.slice(0, -1).map((_, i) => {
          const mid = (markerXPct(i) + markerXPct(i + 1)) / 2
          const ms = durations[i] ?? 0
          return showDurationLabel(i) ? (
            <span
              key={i}
              className={cn(
                'pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-4 text-[10px] font-semibold tabular-nums transition-opacity',
                hoveredSeg === i || draggingMarker === i + 1 ? 'text-white/60' : 'text-white/25',
              )}
              style={{ left: `${mid}%` }}
            >
              {(ms / 1000).toFixed(1)}s
            </span>
          ) : null
        })}

        {/* Keyframe markers */}
        {frames.map((_, i) => {
          const fixed = i === 0 || i === frames.length - 1
          const draggable = !fixed && !viewOnly
          const xPct = markerXPct(i)

          return (
            <div
              key={i}
              data-marker
              className={cn(
                'absolute top-0 flex h-full flex-col items-center justify-start',
                draggable && 'cursor-ew-resize',
              )}
              style={{ left: `${xPct}%`, transform: 'translateX(-50%)' }}
              onPointerDown={draggable ? (e) => handleMarkerPointerDown(e, i) : undefined}
              onPointerMove={draggable ? (e) => handleMarkerPointerMove(e, i) : undefined}
              onPointerUp={draggable ? handleMarkerPointerUp : undefined}
              onClick={(e) => { e.stopPropagation(); onSelectFrame(i) }}
            >
              {/* Tick */}
              <div
                className={cn(
                  'w-0.5 rounded-full',
                  i === activeFrameIndex
                    ? 'h-5 bg-blue-400'
                    : fixed
                    ? 'h-3 bg-white/50'
                    : 'h-4 bg-white/40',
                )}
              />
              {/* Frame number */}
              <span
                className={cn(
                  'mt-0.5 text-[10px] font-bold tabular-nums',
                  i === activeFrameIndex ? 'text-blue-400' : 'text-white/40',
                )}
              >
                {i + 1}
              </span>

              {/* Delete button — intermediate frames only, not in viewOnly */}
              {!fixed && !viewOnly && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDeleteFrame(i) }}
                  aria-label={`Delete frame ${i + 1}`}
                  className="absolute -top-5 rounded p-0.5 text-white/0 transition hover:text-red-400 group-hover:text-white/30"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )
        })}

        {/* Playhead — wide hit zone + visible line + grab dot */}
        <div
          data-marker
          className={cn(
            'absolute top-0 flex h-full cursor-grab items-center justify-center active:cursor-grabbing',
            scrubbing && 'cursor-grabbing',
          )}
          style={{ left: `${playheadXPct}%`, width: '28px', transform: 'translateX(-50%)' }}
          onPointerDown={(e) => {
            e.stopPropagation()
            e.currentTarget.setPointerCapture(e.pointerId)
            setScrubbing(true)
            onScrub(ptrToMs(e.clientX))
          }}
          onPointerMove={(e) => {
            if (!scrubbing || e.buttons !== 1) return
            onScrub(ptrToMs(e.clientX))
          }}
          onPointerUp={() => setScrubbing(false)}
        >
          {/* Visible line */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-px bg-white/90" />
          {/* Grab dot centred on groove */}
          <div className="pointer-events-none absolute top-1/2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow-md shadow-black/40" />
        </div>
      </div>
    </div>
  )
}
