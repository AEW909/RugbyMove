import type { PlayerPosition, Zone } from '@/types/play'

/** Linear interpolation between two numbers. amount is typically 0..1 but is not clamped. */
export function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount
}

/**
 * Interpolate player positions from one frame toward the next by `amount`.
 * Players are matched by id; a player with no counterpart in `to` holds position.
 * The result preserves the `from` set (players are never added or dropped mid-segment).
 */
export function interpolatePlayers(
  from: PlayerPosition[],
  to: PlayerPosition[],
  amount: number,
): PlayerPosition[] {
  return from.map((player) => {
    const next = to.find((item) => item.id === player.id) ?? player
    return {
      id: player.id,
      x: lerp(player.x, next.x, amount),
      y: lerp(player.y, next.y, amount),
    }
  })
}

/**
 * Interpolate zone positions from one frame toward the next by `amount`.
 * Zones are matched by id; non-positional fields (r, label) are carried from `from`.
 */
export function interpolateZones(from: Zone[], to: Zone[], amount: number): Zone[] {
  return from.map((zone) => {
    const next = to.find((z) => z.id === zone.id) ?? zone
    return { ...zone, x: lerp(zone.x, next.x, amount), y: lerp(zone.y, next.y, amount) }
  })
}

/** Cumulative segment end-times. Result length === durations.length. */
export function buildCumulative(durations: number[]): number[] {
  const cum: number[] = []
  let acc = 0
  for (const d of durations) {
    acc += d
    cum.push(acc)
  }
  return cum
}

/** Cumulative frame start-times, beginning with 0. Result length === durations.length + 1. */
export function buildFrameStarts(durations: number[]): number[] {
  const cum = [0]
  for (const d of durations) cum.push(cum[cum.length - 1] + d)
  return cum
}
