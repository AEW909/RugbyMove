import { describe, it, expect } from 'vitest'
import type { PlayerPosition, Zone } from '@/types/play'
import {
  lerp,
  interpolatePlayers,
  interpolateZones,
  buildCumulative,
  buildFrameStarts,
} from '@/lib/board/math'

describe('lerp', () => {
  it('returns the start value at amount 0', () => {
    expect(lerp(10, 20, 0)).toBe(10)
  })

  it('returns the end value at amount 1', () => {
    expect(lerp(10, 20, 1)).toBe(20)
  })

  it('returns the midpoint at amount 0.5', () => {
    expect(lerp(10, 20, 0.5)).toBe(15)
  })

  it('handles a descending range', () => {
    expect(lerp(20, 0, 0.25)).toBe(15)
  })

  it('does not clamp beyond 0..1', () => {
    expect(lerp(0, 10, 2)).toBe(20)
    expect(lerp(0, 10, -1)).toBe(-10)
  })
})

describe('interpolatePlayers', () => {
  const from: PlayerPosition[] = [
    { id: 'attack-1', x: 0, y: 0 },
    { id: 'attack-2', x: 10, y: 20 },
  ]
  const to: PlayerPosition[] = [
    { id: 'attack-1', x: 100, y: 50 },
    { id: 'attack-2', x: 10, y: 20 },
  ]

  it('interpolates each player by id at the given amount', () => {
    const result = interpolatePlayers(from, to, 0.5)
    expect(result).toEqual([
      { id: 'attack-1', x: 50, y: 25 },
      { id: 'attack-2', x: 10, y: 20 },
    ])
  })

  it('holds a player in place when it has no counterpart in the target frame', () => {
    const partialTo: PlayerPosition[] = [{ id: 'attack-1', x: 100, y: 100 }]
    const result = interpolatePlayers(from, partialTo, 1)
    // attack-2 is missing from the target, so it should stay put
    expect(result.find((p) => p.id === 'attack-2')).toEqual({ id: 'attack-2', x: 10, y: 20 })
  })

  it('preserves the from set — never adds players present only in the target', () => {
    const extraTo: PlayerPosition[] = [
      ...to,
      { id: 'defend-1', x: 5, y: 5 },
    ]
    const result = interpolatePlayers(from, extraTo, 0.5)
    expect(result).toHaveLength(2)
    expect(result.find((p) => p.id === 'defend-1')).toBeUndefined()
  })

  it('returns a start-frame copy at amount 0', () => {
    expect(interpolatePlayers(from, to, 0)).toEqual(from)
  })
})

describe('interpolateZones', () => {
  const from: Zone[] = [{ id: 'z1', x: 0, y: 0, r: 10, label: 'A' }]
  const to: Zone[] = [{ id: 'z1', x: 40, y: 80, r: 25, label: 'B' }]

  it('interpolates position but carries r and label from the source zone', () => {
    const result = interpolateZones(from, to, 0.5)
    expect(result).toEqual([{ id: 'z1', x: 20, y: 40, r: 10, label: 'A' }])
  })

  it('holds a zone in place when it has no counterpart in the target frame', () => {
    const result = interpolateZones(from, [], 1)
    expect(result).toEqual(from)
  })
})

describe('buildCumulative', () => {
  it('returns running end-times with one entry per duration', () => {
    expect(buildCumulative([900, 600, 300])).toEqual([900, 1500, 1800])
  })

  it('returns an empty array for no durations', () => {
    expect(buildCumulative([])).toEqual([])
  })
})

describe('buildFrameStarts', () => {
  it('returns frame start-times beginning at 0 with one extra entry', () => {
    expect(buildFrameStarts([900, 600, 300])).toEqual([0, 900, 1500, 1800])
  })

  it('returns just [0] for no durations', () => {
    expect(buildFrameStarts([])).toEqual([0])
  })
})
