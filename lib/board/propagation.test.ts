import { describe, it, expect } from 'vitest'
import type { Frame, PlayerPosition } from '@/types/play'
import { propagatePlayerMove, activeIndexAfterDelete } from '@/lib/board/frames'

// Minimal frame builder — only players matter for these tests; zones/lines
// are filled by normalizeFrame inside propagatePlayerMove.
function frame(players: PlayerPosition[]): Frame {
  return { players, zones: [], lines: [] }
}

const single = { isGroupMove: false, selectedPlayerIds: new Set<string>() }

describe('propagatePlayerMove — single move', () => {
  it('repositions the moved player on the active frame', () => {
    const frames = [frame([{ id: 'a1', x: 10, y: 10 }])]
    const result = propagatePlayerMove(frames, 0, 'a1', 50, 60, single)
    expect(result[0].players[0]).toEqual({ id: 'a1', x: 50, y: 60 })
  })

  it('leaves other players on the active frame untouched', () => {
    const frames = [
      frame([
        { id: 'a1', x: 10, y: 10 },
        { id: 'a2', x: 20, y: 20 },
      ]),
    ]
    const result = propagatePlayerMove(frames, 0, 'a1', 50, 60, single)
    expect(result[0].players[1]).toEqual({ id: 'a2', x: 20, y: 20 })
  })

  it('propagates forward while later frames still hold the pre-move position', () => {
    const frames = [
      frame([{ id: 'a1', x: 10, y: 10 }]),
      frame([{ id: 'a1', x: 10, y: 10 }]),
      frame([{ id: 'a1', x: 10, y: 10 }]),
    ]
    const result = propagatePlayerMove(frames, 0, 'a1', 50, 60, single)
    expect(result.map((f) => f.players[0])).toEqual([
      { id: 'a1', x: 50, y: 60 },
      { id: 'a1', x: 50, y: 60 },
      { id: 'a1', x: 50, y: 60 },
    ])
  })

  it('stops at a barrier — a frame with an explicit (different) position', () => {
    const frames = [
      frame([{ id: 'a1', x: 10, y: 10 }]),
      frame([{ id: 'a1', x: 10, y: 10 }]), // inherited → should update
      frame([{ id: 'a1', x: 90, y: 90 }]), // explicit keyframe → barrier
      frame([{ id: 'a1', x: 10, y: 10 }]), // beyond the barrier → must NOT update
    ]
    const result = propagatePlayerMove(frames, 0, 'a1', 50, 60, single)
    expect(result.map((f) => f.players[0])).toEqual([
      { id: 'a1', x: 50, y: 60 },
      { id: 'a1', x: 50, y: 60 },
      { id: 'a1', x: 90, y: 90 },
      { id: 'a1', x: 10, y: 10 },
    ])
  })

  it('does not propagate backward to earlier frames', () => {
    const frames = [
      frame([{ id: 'a1', x: 10, y: 10 }]),
      frame([{ id: 'a1', x: 10, y: 10 }]),
    ]
    const result = propagatePlayerMove(frames, 1, 'a1', 50, 60, single)
    expect(result[0].players[0]).toEqual({ id: 'a1', x: 10, y: 10 })
    expect(result[1].players[0]).toEqual({ id: 'a1', x: 50, y: 60 })
  })

  it('only propagates the moved player, not others sharing the frame', () => {
    const frames = [
      frame([
        { id: 'a1', x: 10, y: 10 },
        { id: 'a2', x: 20, y: 20 },
      ]),
      frame([
        { id: 'a1', x: 10, y: 10 },
        { id: 'a2', x: 20, y: 20 },
      ]),
    ]
    const result = propagatePlayerMove(frames, 0, 'a1', 50, 60, single)
    expect(result[1].players).toEqual([
      { id: 'a1', x: 50, y: 60 },
      { id: 'a2', x: 20, y: 20 },
    ])
  })
})

describe('propagatePlayerMove — group move', () => {
  const groupOpts = {
    isGroupMove: true,
    selectedPlayerIds: new Set(['a1', 'a2']),
  }

  it('shifts all selected players by the same delta on the active frame', () => {
    const frames = [
      frame([
        { id: 'a1', x: 10, y: 10 },
        { id: 'a2', x: 20, y: 30 },
        { id: 'a3', x: 40, y: 40 },
      ]),
    ]
    // a1 dragged from (10,10) to (15,18): delta (+5, +8)
    const result = propagatePlayerMove(frames, 0, 'a1', 15, 18, groupOpts)
    expect(result[0].players).toEqual([
      { id: 'a1', x: 15, y: 18 },
      { id: 'a2', x: 25, y: 38 },
      { id: 'a3', x: 40, y: 40 }, // not selected → unmoved
    ])
  })

  it('does not propagate a group move to later frames', () => {
    const frames = [
      frame([
        { id: 'a1', x: 10, y: 10 },
        { id: 'a2', x: 20, y: 30 },
      ]),
      frame([
        { id: 'a1', x: 10, y: 10 },
        { id: 'a2', x: 20, y: 30 },
      ]),
    ]
    const result = propagatePlayerMove(frames, 0, 'a1', 15, 18, groupOpts)
    expect(result[1].players).toEqual([
      { id: 'a1', x: 10, y: 10 },
      { id: 'a2', x: 20, y: 30 },
    ])
  })

  it('clamps shifted teammates to the board edges', () => {
    const frames = [
      frame([
        { id: 'a1', x: 10, y: 10 },
        { id: 'a2', x: 98, y: 5 },
      ]),
    ]
    // delta (+40, -8) would push a2 to (138, -3) → clamps to (100, 0)
    const result = propagatePlayerMove(frames, 0, 'a1', 50, 2, groupOpts)
    expect(result[0].players[1]).toEqual({ id: 'a2', x: 100, y: 0 })
  })
})

describe('activeIndexAfterDelete', () => {
  it('shifts left when the deleted frame is before the current one', () => {
    // frames [0,1,2,3], current 3, delete 1 → new length 3, index 2
    expect(activeIndexAfterDelete(3, 1, 3)).toBe(2)
  })

  it('steps back one when the current frame itself is deleted', () => {
    expect(activeIndexAfterDelete(2, 2, 3)).toBe(1)
  })

  it('stays at 0 when deleting frame 0 while on it', () => {
    expect(activeIndexAfterDelete(0, 0, 1)).toBe(0)
  })

  it('is unchanged when the deleted frame is after the current one', () => {
    expect(activeIndexAfterDelete(1, 3, 3)).toBe(1)
  })

  it('never points past the end of the shortened list', () => {
    // current 2, delete 4 (after), but new length is 2 → clamp to 1
    expect(activeIndexAfterDelete(2, 4, 2)).toBe(1)
  })
})
