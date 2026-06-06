'use client'

import { useCallback, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Frame, PlayerPosition, Zone } from '@/types/play'
import { normalizeDurations } from '@/hooks/useTacticalBoard'
import { buildCumulative } from '@/lib/board/math'

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

function interpolatePlayers(from: PlayerPosition[], to: PlayerPosition[], amount: number): PlayerPosition[] {
  return from.map((player) => {
    const next = to.find((p) => p.id === player.id) ?? player
    return { id: player.id, x: lerp(player.x, next.x, amount), y: lerp(player.y, next.y, amount) }
  })
}

function interpolateZones(from: Zone[], to: Zone[], amount: number): Zone[] {
  return from.map((zone) => {
    const next = to.find((z) => z.id === zone.id) ?? zone
    return { ...zone, x: lerp(zone.x, next.x, amount), y: lerp(zone.y, next.y, amount) }
  })
}

type Params = {
  frames: Frame[]
  durations: number[]
  setActiveFrameIndex: Dispatch<SetStateAction<number>>
}

export function usePlayback({ frames, durations, setActiveFrameIndex }: Params) {
  const animationRef = useRef<number | null>(null)
  const [displayPlayers, setDisplayPlayers] = useState<PlayerPosition[] | null>(null)
  const [displayZones, setDisplayZones] = useState<Zone[] | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const stopPlayback = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    setIsPlaying(false)
    setDisplayPlayers(null)
    setDisplayZones(null)
  }, [])

  const playFrames = useCallback(() => {
    const validFrames = frames.filter((f) => f.players.length > 0)
    if (validFrames.length < 2 || isPlaying) return

    const segDurations = normalizeDurations(durations, validFrames.length)
    const cumulative = buildCumulative(segDurations)
    const totalMs = cumulative[cumulative.length - 1] ?? 0
    const startedAt = performance.now()
    setIsPlaying(true)

    const tick = (now: number) => {
      const elapsed = now - startedAt
      if (elapsed >= totalMs) {
        setActiveFrameIndex(validFrames.length - 1)
        setDisplayPlayers(null)
        setIsPlaying(false)
        animationRef.current = null
        return
      }

      let seg = 0
      for (let i = 0; i < cumulative.length; i++) {
        if (elapsed < cumulative[i]) { seg = i; break }
        seg = i
      }
      const segStart = seg === 0 ? 0 : cumulative[seg - 1]
      const segEnd = cumulative[seg]
      const progress = Math.min(1, (elapsed - segStart) / (segEnd - segStart))

      setActiveFrameIndex(seg)
      setDisplayPlayers(interpolatePlayers(validFrames[seg].players, validFrames[seg + 1].players, progress))
      setDisplayZones(interpolateZones(validFrames[seg].zones ?? [], validFrames[seg + 1].zones ?? [], progress))
      animationRef.current = requestAnimationFrame(tick)
    }

    animationRef.current = requestAnimationFrame(tick)
  }, [frames, durations, isPlaying, setActiveFrameIndex])

  const scrubTo = useCallback(
    (timeMs: number) => {
      if (isPlaying) return
      if (frames.length < 2) return
      const segDurations = normalizeDurations(durations, frames.length)
      const cumulative = buildCumulative(segDurations)
      const total = cumulative[cumulative.length - 1] ?? 0
      const t0 = Math.min(total, Math.max(0, timeMs))

      let seg = 0
      for (let i = 0; i < cumulative.length; i++) {
        if (t0 <= cumulative[i]) { seg = i; break }
        seg = i
      }
      const segStart = seg === 0 ? 0 : cumulative[seg - 1]
      const segEnd = cumulative[seg]
      const progress = segEnd > segStart ? (t0 - segStart) / (segEnd - segStart) : 0
      const next = Math.min(seg + 1, frames.length - 1)

      setActiveFrameIndex(seg)
      setDisplayPlayers(interpolatePlayers(frames[seg].players, frames[next].players, progress))
      setDisplayZones(interpolateZones(frames[seg].zones ?? [], frames[next].zones ?? [], progress))
    },
    [frames, durations, isPlaying, setActiveFrameIndex],
  )

  return { displayPlayers, displayZones, isPlaying, playFrames, stopPlayback, scrubTo }
}
