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
  zones: [],
  lines: [],
}

export const SCRUM_FORMATION: Formation = {
  id: 'builtin-scrum',
  name: 'Scrum',
  category: 'Scrum',
  createdAt: '',
  players: [
    { id: 'ball',      x: 50.04, y: 12.09 },
    { id: 'attack-1',  x: 48.76, y: 15.30 },
    { id: 'attack-2',  x: 48.84, y: 18.51 },
    { id: 'attack-3',  x: 48.84, y: 21.72 },
    { id: 'attack-4',  x: 46.99, y: 16.69 },
    { id: 'attack-5',  x: 46.99, y: 20.01 },
    { id: 'attack-6',  x: 47.07, y: 13.70 },
    { id: 'attack-7',  x: 47.07, y: 22.79 },
    { id: 'attack-8',  x: 45.06, y: 18.19 },
    { id: 'attack-9',  x: 50.04, y: 9.74  },
    { id: 'attack-10', x: 4,     y: 62.5  },
    { id: 'attack-11', x: 4,     y: 69    },
    { id: 'attack-12', x: 4,     y: 75.5  },
    { id: 'attack-13', x: 4,     y: 82    },
    { id: 'attack-14', x: 4,     y: 88.5  },
    { id: 'attack-15', x: 4,     y: 95    },
    { id: 'defend-1',  x: 50.92, y: 21.83 },
    { id: 'defend-2',  x: 50.84, y: 18.83 },
    { id: 'defend-3',  x: 50.84, y: 15.73 },
    { id: 'defend-4',  x: 52.77, y: 20.44 },
    { id: 'defend-5',  x: 52.85, y: 17.23 },
    { id: 'defend-6',  x: 52.69, y: 14.23 },
    { id: 'defend-7',  x: 52.77, y: 23.33 },
    { id: 'defend-8',  x: 54.61, y: 18.62 },
    { id: 'defend-9',  x: 53.65, y: 9.84  },
    { id: 'defend-10', x: 96,    y: 62.5  },
    { id: 'defend-11', x: 96,    y: 69    },
    { id: 'defend-12', x: 96,    y: 75.5  },
    { id: 'defend-13', x: 96,    y: 82    },
    { id: 'defend-14', x: 96,    y: 88.5  },
    { id: 'defend-15', x: 96,    y: 95    },
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
