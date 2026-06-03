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

export const SCRUM_FORMATION: Formation = {
  id: 'builtin-scrum',
  name: 'Scrum',
  category: 'Scrum',
  createdAt: '',
  players: [
    { id: 'ball',      x: 47, y: 44 },
    { id: 'attack-1',  x: 43, y: 41 },
    { id: 'attack-2',  x: 41, y: 46 },
    { id: 'attack-3',  x: 41, y: 51 },
    { id: 'attack-4',  x: 39, y: 42 },
    { id: 'attack-5',  x: 39, y: 47 },
    { id: 'attack-6',  x: 35, y: 38 },
    { id: 'attack-7',  x: 35, y: 54 },
    { id: 'attack-8',  x: 37, y: 47 },
    { id: 'attack-9',  x: 50, y: 32 },
    { id: 'defend-3',  x: 53, y: 41 },
    { id: 'defend-2',  x: 55, y: 46 },
    { id: 'defend-1',  x: 53, y: 51 },
    { id: 'defend-5',  x: 57, y: 42 },
    { id: 'defend-4',  x: 57, y: 47 },
    { id: 'defend-7',  x: 61, y: 38 },
    { id: 'defend-6',  x: 61, y: 54 },
    { id: 'defend-8',  x: 59, y: 47 },
    { id: 'defend-9',  x: 51, y: 32 },
  ],
}

export const LINEOUT_FORMATION: Formation = {
  id: 'builtin-lineout',
  name: 'Lineout',
  category: 'Lineout',
  createdAt: '',
  players: [
    { id: 'ball',      x: 31, y: 7 },
    { id: 'attack-2',  x: 28, y: 4 },
    { id: 'defend-2',  x: 44, y: 4 },
    { id: 'attack-9',  x: 9,  y: 26 },
    { id: 'attack-1',  x: 30, y: 21 },
    { id: 'attack-4',  x: 30, y: 26 },
    { id: 'attack-3',  x: 30, y: 31 },
    { id: 'attack-5',  x: 30, y: 36 },
    { id: 'attack-6',  x: 30, y: 41 },
    { id: 'attack-7',  x: 30, y: 46 },
    { id: 'attack-8',  x: 30, y: 51 },
    { id: 'defend-1',  x: 36, y: 21 },
    { id: 'defend-4',  x: 36, y: 26 },
    { id: 'defend-3',  x: 36, y: 31 },
    { id: 'defend-5',  x: 36, y: 36 },
    { id: 'defend-6',  x: 36, y: 41 },
    { id: 'defend-7',  x: 36, y: 46 },
    { id: 'defend-8',  x: 36, y: 51 },
  ],
}
