import type { Frame } from '@/types/play'
import { defaultFrame } from '@/lib/board/defaults'

export const DEFAULT_DURATION = 900
export const MIN_DURATION = 200
export const MAX_DURATION = 3000

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

/** Transpose (x,y) → (y,x). Its own inverse, so it handles both rotation directions. */
export function rotatePitchCoords<T extends { x: number; y: number }>(p: T): T {
  return { ...p, x: p.y, y: p.x }
}

export function normalizeFrame(frame: Partial<Frame> | undefined): Frame {
  return {
    players: Array.isArray(frame?.players) ? frame.players : defaultFrame.players,
    zones: Array.isArray(frame?.zones) ? frame.zones : [],
    lines: Array.isArray(frame?.lines) ? frame.lines : [],
  }
}

export function normalizeFrames(nextFrames: Partial<Frame>[] | undefined): Frame[] {
  if (!Array.isArray(nextFrames) || nextFrames.length === 0) {
    return [defaultFrame]
  }
  return nextFrames.map(normalizeFrame)
}

export function normalizeDurations(raw: number[] | undefined, frameCount: number): number[] {
  const needed = Math.max(0, frameCount - 1)
  const base = Array.isArray(raw) ? raw : []
  return Array.from({ length: needed }, (_, i) =>
    Math.min(MAX_DURATION, Math.max(MIN_DURATION, base[i] ?? DEFAULT_DURATION)),
  )
}
