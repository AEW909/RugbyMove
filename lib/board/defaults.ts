import type { Formation } from '@/lib/board/storage'
import type { Frame, PlayerPosition } from '@/types/play'

export type Token = {
  id: string
  label: string
  side: 'attack' | 'defend' | 'ball'
}

export const tokens: Token[] = [
  ...Array.from({ length: 15 }, (_, index) => ({
    id: `attack-${index + 1}`,
    label: String(index + 1),
    side: 'attack' as const,
  })),
  ...Array.from({ length: 15 }, (_, index) => ({
    id: `defend-${index + 1}`,
    label: String(index + 1),
    side: 'defend' as const,
  })),
  { id: 'ball', label: '', side: 'ball' as const },
]

function createDefaultPlayers(): PlayerPosition[] {
  return tokens.map((token, index) => {
    if (token.side === 'ball') {
      return { id: token.id, x: 50, y: 45 }
    }
    const teamIndex = token.side === 'attack' ? index : index - 15
    const y = 4 + teamIndex * 6.5
    return {
      id: token.id,
      x: token.side === 'attack' ? 4 : 96,
      y,
    }
  })
}

export const defaultFrame: Frame = {
  players: createDefaultPlayers(),
  lines: [],
}

const defaultPlayerMap = new Map(createDefaultPlayers().map((p) => [p.id, p]))

/**
 * IDs of players who have been moved off their default tray position in this frame.
 * Used only when saving a formation, so untouched tray players don't pollute the
 * abstract shape — there is no other "active/inactive" distinction in the app.
 */
export function playersMovedFromDefault(frame: Frame): string[] {
  return frame.players
    .filter((p) => {
      if (p.id === 'ball') return false
      const def = defaultPlayerMap.get(p.id)
      if (!def) return true
      return Math.abs(p.x - def.x) > 1 || Math.abs(p.y - def.y) > 1
    })
    .map((p) => p.id)
}

export const SCRUM_FORMATION: Formation = {
  id: 'builtin-scrum',
  name: 'Scrum',
  category: 'Scrum',
  createdAt: '',
  slots: [
    { side: 'ball',    x: 50.04, y: 12.09 },
    { side: 'attack',  x: 48.76, y: 15.30 },
    { side: 'attack',  x: 48.84, y: 18.51 },
    { side: 'attack',  x: 48.84, y: 21.72 },
    { side: 'attack',  x: 46.99, y: 16.69 },
    { side: 'attack',  x: 46.99, y: 20.01 },
    { side: 'attack',  x: 47.07, y: 13.70 },
    { side: 'attack',  x: 47.07, y: 22.79 },
    { side: 'attack',  x: 45.06, y: 18.19 },
    { side: 'attack',  x: 50.04, y:  9.74 },
    { side: 'defend',  x: 50.92, y: 21.83 },
    { side: 'defend',  x: 50.84, y: 18.83 },
    { side: 'defend',  x: 50.84, y: 15.73 },
    { side: 'defend',  x: 52.77, y: 20.44 },
    { side: 'defend',  x: 52.85, y: 17.23 },
    { side: 'defend',  x: 52.69, y: 14.23 },
    { side: 'defend',  x: 52.77, y: 23.33 },
    { side: 'defend',  x: 54.61, y: 18.62 },
    { side: 'defend',  x: 53.65, y:  9.84 },
  ],
}

export const LINEOUT_FORMATION: Formation = {
  id: 'builtin-lineout',
  name: 'Lineout',
  category: 'Lineout',
  createdAt: '',
  slots: [
    { side: 'ball',    x: 31, y:  7 },
    { side: 'attack',  x: 28, y:  4 },
    { side: 'attack',  x:  9, y: 26 },
    { side: 'attack',  x: 30, y: 21 },
    { side: 'attack',  x: 30, y: 26 },
    { side: 'attack',  x: 30, y: 31 },
    { side: 'attack',  x: 30, y: 36 },
    { side: 'attack',  x: 30, y: 41 },
    { side: 'attack',  x: 30, y: 46 },
    { side: 'attack',  x: 30, y: 51 },
    { side: 'defend',  x: 44, y:  4 },
    { side: 'defend',  x: 36, y: 21 },
    { side: 'defend',  x: 36, y: 26 },
    { side: 'defend',  x: 36, y: 31 },
    { side: 'defend',  x: 36, y: 36 },
    { side: 'defend',  x: 36, y: 41 },
    { side: 'defend',  x: 36, y: 46 },
    { side: 'defend',  x: 36, y: 51 },
  ],
}
