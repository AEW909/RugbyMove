'use client'

import { useCallback, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Frame, PlayerPosition, Zone } from '@/types/play'
import { normalizeDurations } from '@/hooks/useTacticalBoard'

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

function interpolatePlayers(from: PlayerPosition[], to: PlayerPosition[], amount: number): PlayerPosition[] {
  return from.map((player) => {
    const next = to.find((item) => item.id === player.id) ?? player
    return {
      id: player.id,
      x: lerp(player.x, next.x, amount),
      y: lerp(player.y, next.y, amount),
    }
  })
}

function interpolateZones(from: Zone[], to: Zone[], amount: number): Zone[] {
  return from.map((zone) => {
    const next = to.find((z) => z.id === zone.id) ?? zone
    return { ...zone, x: lerp(zone.x, next.x, amount), y: lerp(zone.y, next.y, amount) }
  })
}

function buildCumulative(durations: number[]): number[] {
  const cum: number[] = []
  let acc = 0
  for (const d of durations) {
    acc += d
    cum.push(acc)
  }
  return cum
}

function normalizeFrame(frame: Partial<Frame>): Frame {
  return {
    players: Array.isArray(frame?.players) ? frame.players : [],
    zones: Array.isArray(frame?.zones) ? frame.zones : [],
    lines: Array.isArray(frame?.lines) ? frame.lines : [],
  }
}

function normalizeFrames(nextFrames: Partial<Frame>[] | undefined): Frame[] {
  if (!Array.isArray(nextFrames) || nextFrames.length === 0) return []
  return nextFrames.map(normalizeFrame)
}

export type UsePlaybackParams = {
  frames: Frame[]
  durations: number[]
  setActiveFrameIndex: Dispatch<SetStateAction<number>>
}

export type UsePlaybackReturn = {
  displayPlayers: PlayerPosition[] | null
  displayZones: Zone[] | null
  isPlaying: boolean
  playFrames: () => void
  stopPlayback: () => void
  scrubTo: (timeMs: number) => void
}

export function usePlayback({
  frames,
  durations,
  setActiveFrameIndex,
}: UsePlaybackParams): UsePlaybackReturn {
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
    const playbackFrames = normalizeFrames(frames).filter((frame) => frame.players.length > 0)
    if (playbackFrames.length < 2 || isPlaying) return

    const segDurations = normalizeDurations(durations, playbackFrames.length)
    const cumulative = buildCumulative(segDurations)
    const totalMs = cumulative[cumulative.length - 1] ?? 0

    const startedAt = performance.now()
    setIsPlaying(true)

    const tick = (now: number) => {
      const elapsed = now - startedAt

      if (elapsed >= totalMs) {
        setActiveFrameIndex(playbackFrames.length - 1)
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
      setDisplayPlayers(
        interpolatePlayers(playbackFrames[seg].players, playbackFrames[seg + 1].players, progress),
      )
      setDisplayZones(
        interpolateZones(playbackFrames[seg].zones ?? [], playbackFrames[seg + 1].zones ?? [], progress),
      )
      animationRef.current = requestAnimationFrame(tick)
    }

    animationRef.current = requestAnimationFrame(tick)
  }, [frames, durations, isPlaying, setActiveFrameIndex])

  const scrubTo = useCallback(
    (timeMs: number) => {
      if (isPlaying) return
      const playbackFrames = normalizeFrames(frames)
      if (playbackFrames.length < 2) return
      const segDurations = normalizeDurations(durations, playbackFrames.length)
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

      setActiveFrameIndex(seg)
      setDisplayPlayers(
        interpolatePlayers(playbackFrames[seg].players, playbackFrames[Math.min(seg + 1, playbackFrames.length - 1)].players, progress),
      )
      setDisplayZones(
        interpolateZones(playbackFrames[seg].zones ?? [], playbackFrames[Math.min(seg + 1, playbackFrames.length - 1)].zones ?? [], progress),
      )
    },
    [frames, durations, isPlaying, setActiveFrameIndex],
  )

  return {
    displayPlayers,
    displayZones,
    isPlaying,
    playFrames,
    stopPlayback,
    scrubTo,
  }
}
