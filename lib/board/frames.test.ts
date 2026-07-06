import { describe, it, expect } from 'vitest'
import type { Frame } from '@/types/play'
import { defaultFrame } from '@/lib/board/defaults'
import {
  clamp,
  rotatePitchCoords,
  normalizeFrame,
  normalizeFrames,
  normalizeDurations,
  DEFAULT_DURATION,
  MIN_DURATION,
  MAX_DURATION,
} from '@/lib/board/frames'

describe('clamp', () => {
  it('leaves an in-range value untouched', () => {
    expect(clamp(50)).toBe(50)
  })

  it('clamps to the default 0..100 bounds', () => {
    expect(clamp(-5)).toBe(0)
    expect(clamp(150)).toBe(100)
  })

  it('respects custom bounds', () => {
    expect(clamp(5, 10, 20)).toBe(10)
    expect(clamp(25, 10, 20)).toBe(20)
  })
})

describe('rotatePitchCoords', () => {
  it('transposes x and y', () => {
    expect(rotatePitchCoords({ x: 10, y: 90 })).toEqual({ x: 90, y: 10 })
  })

  it('is its own inverse', () => {
    const p = { x: 30, y: 70 }
    expect(rotatePitchCoords(rotatePitchCoords(p))).toEqual(p)
  })

  it('preserves other fields on the object', () => {
    expect(rotatePitchCoords({ id: 'z1', x: 10, y: 20, r: 5, label: 'A' })).toEqual({
      id: 'z1',
      x: 20,
      y: 10,
      r: 5,
      label: 'A',
    })
  })
})

describe('normalizeFrame', () => {
  it('fills missing players with the default lineup', () => {
    const result = normalizeFrame({ lines: [] })
    expect(result.players).toEqual(defaultFrame.players)
  })

  it('defaults zones and lines to empty arrays', () => {
    const result = normalizeFrame({ players: [{ id: 'ball', x: 50, y: 50 }] })
    expect(result.zones).toEqual([])
    expect(result.lines).toEqual([])
  })

  it('preserves provided players, zones, and lines', () => {
    const frame: Frame = {
      players: [{ id: 'attack-1', x: 1, y: 2 }],
      zones: [{ id: 'z1', x: 10, y: 20, r: 5, label: 'A' }],
      lines: [{ id: 'l1', from: { x: 0, y: 0 }, to: { x: 5, y: 5 } }],
    }
    expect(normalizeFrame(frame)).toEqual(frame)
  })

  it('handles undefined input', () => {
    const result = normalizeFrame(undefined)
    expect(result.players).toEqual(defaultFrame.players)
    expect(result.zones).toEqual([])
    expect(result.lines).toEqual([])
  })
})

describe('normalizeFrames', () => {
  it('returns a single default frame for empty input', () => {
    expect(normalizeFrames([])).toEqual([defaultFrame])
    expect(normalizeFrames(undefined)).toEqual([defaultFrame])
  })

  it('normalizes every frame in the array', () => {
    const result = normalizeFrames([{ players: [{ id: 'ball', x: 50, y: 50 }] }, {}])
    expect(result).toHaveLength(2)
    expect(result[0].zones).toEqual([])
    expect(result[1].players).toEqual(defaultFrame.players)
  })
})

describe('normalizeDurations', () => {
  it('produces frameCount - 1 durations', () => {
    expect(normalizeDurations([900, 900], 3)).toHaveLength(2)
  })

  it('fills missing entries with the default duration', () => {
    expect(normalizeDurations([], 3)).toEqual([DEFAULT_DURATION, DEFAULT_DURATION])
  })

  it('clamps values below MIN and above MAX', () => {
    expect(normalizeDurations([50, 9000], 3)).toEqual([MIN_DURATION, MAX_DURATION])
  })

  it('returns an empty array for a single frame', () => {
    expect(normalizeDurations([900], 1)).toEqual([])
  })

  it('returns an empty array for zero frames', () => {
    expect(normalizeDurations(undefined, 0)).toEqual([])
  })
})
