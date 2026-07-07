import { describe, it, expect } from 'vitest'
import { animationDataSchema } from '@/lib/board/schema'
import { normalizeFrames } from '@/lib/board/frames'

describe('animationDataSchema', () => {
  it('strips a legacy activePlayers field instead of rejecting the payload', () => {
    // Older saves may still carry the removed activePlayers field (see CLAUDE.md /
    // the save-integrity fix). Loading one must not error, and the field must not
    // survive parsing — nothing downstream should ever see it again.
    const legacy = {
      frames: [
        {
          players: [
            { id: 'attack-1', x: 40, y: 20 },
            { id: 'defend-1', x: 60, y: 20 },
            { id: 'ball', x: 50, y: 20 },
          ],
          lines: [],
        },
      ],
      activePlayers: ['attack-1'],
    }

    const result = animationDataSchema.safeParse(legacy)
    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data).not.toHaveProperty('activePlayers')
    expect(result.data.frames[0].players).toHaveLength(3)
    // Every player in the frame is a first-class citizen post-parse — none of them
    // are filtered out by the (now-removed) active-players concept.
    expect(result.data.frames[0].players.map((p) => p.id).sort()).toEqual(
      ['attack-1', 'ball', 'defend-1'],
    )
  })

  it('rejects a payload with no frames field at all', () => {
    expect(animationDataSchema.safeParse({}).success).toBe(false)
  })

  it('rejects an empty frames array', () => {
    expect(animationDataSchema.safeParse({ frames: [] }).success).toBe(false)
  })

  it('rejects a frame missing its players array', () => {
    expect(
      animationDataSchema.safeParse({ frames: [{ lines: [] }] }).success,
    ).toBe(false)
  })

  it('is a lossless round trip for well-formed data (parse then normalize)', () => {
    const input = {
      frames: [
        {
          players: [
            { id: 'attack-1', x: 10, y: 20 },
            { id: 'ball', x: 50, y: 50 },
          ],
          zones: [{ id: 'z1', x: 30, y: 30, r: 8, label: 'A' }],
          lines: [],
        },
      ],
      durations: [],
      pitchPortrait: false,
    }

    const parsed = animationDataSchema.parse(input)
    expect(normalizeFrames(parsed.frames)).toEqual(parsed.frames)
  })
})
