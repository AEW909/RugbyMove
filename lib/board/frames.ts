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

/**
 * Apply a player move on the active frame and propagate it forward.
 *
 * - Single move: the moved player is repositioned on the active frame, then the
 *   same new position flows into each subsequent frame *only* while that frame
 *   still holds the player's pre-move position. The first frame that differs is
 *   a "barrier" (an explicit keyframe); propagation stops there and beyond.
 * - Group move (`isGroupMove`): every selected player shifts by the same delta on
 *   the active frame only — no forward propagation.
 *
 * `newX`/`newY` are assumed already clamped by the caller; group deltas are
 * re-clamped per player so shifted teammates stay on the board.
 */
export function propagatePlayerMove(
  frames: Frame[],
  activeFrameIndex: number,
  id: string,
  newX: number,
  newY: number,
  opts: { isGroupMove: boolean; selectedPlayerIds: Set<string> },
): Frame[] {
  const { isGroupMove, selectedPlayerIds } = opts
  const prev = frames[activeFrameIndex]?.players.find((p) => p.id === id)
  const oldX = prev?.x ?? newX
  const oldY = prev?.y ?? newY

  let hitBarrier = false

  return normalizeFrames(
    frames.map((frame, index) => {
      // Active frame — apply the move
      if (index === activeFrameIndex) {
        if (isGroupMove && prev) {
          const dx = newX - prev.x
          const dy = newY - prev.y
          return {
            ...frame,
            players: frame.players.map((p) =>
              selectedPlayerIds.has(p.id)
                ? { ...p, x: clamp(p.x + dx), y: clamp(p.y + dy) }
                : p,
            ),
          }
        }
        return {
          ...frame,
          players: frame.players.map((p) =>
            p.id === id ? { ...p, x: newX, y: newY } : p,
          ),
        }
      }

      // Subsequent frames — propagate only while the position is still inherited.
      if (index > activeFrameIndex && !isGroupMove && !hitBarrier) {
        const fp = frame.players.find((p) => p.id === id)
        if (fp && fp.x === oldX && fp.y === oldY) {
          return {
            ...frame,
            players: frame.players.map((p) =>
              p.id === id ? { ...p, x: newX, y: newY } : p,
            ),
          }
        }
        hitBarrier = true
      }

      return frame
    }),
  )
}

/**
 * The active frame index after deleting `indexToDelete`, given the post-delete
 * frame count. Keeps the playhead on a valid frame: shift left when the deletion
 * was at or before the current frame, and never point past the end.
 */
export function activeIndexAfterDelete(
  currentIndex: number,
  indexToDelete: number,
  nextLength: number,
): number {
  if (currentIndex > indexToDelete) return currentIndex - 1
  if (currentIndex === indexToDelete) return Math.max(0, currentIndex - 1)
  return Math.min(currentIndex, nextLength - 1)
}
