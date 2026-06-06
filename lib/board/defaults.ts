import type { Formation, FormationSlot } from '@/lib/board/storage'
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

function slot(side: FormationSlot['side'], x: number, y: number): FormationSlot {
  return { side, x, y }
}

export const SCRUM_FORMATION: Formation = {
  id: 'builtin-scrum',
  name: 'Scrum',
  category: 'Scrum',
  createdAt: '',
  slots: [
    slot('ball',    50.04, 12.09),
    slot('attack',  48.76, 15.30), // 1 hooker
    slot('attack',  48.84, 18.51), // 2 prop
    slot('attack',  48.84, 21.72), // 3 prop
    slot('attack',  46.99, 16.69), // 4 lock
    slot('attack',  46.99, 20.01), // 5 lock
    slot('attack',  47.07, 13.70), // 6 flanker
    slot('attack',  47.07, 22.79), // 7 flanker
    slot('attack',  45.06, 18.19), // 8 no. 8
    slot('attack',  50.04,  9.74), // 9 scrum-half
    slot('defend',  50.92, 21.83),
    slot('defend',  50.84, 18.83),
    slot('defend',  50.84, 15.73),
    slot('defend',  52.77, 20.44),
    slot('defend',  52.85, 17.23),
    slot('defend',  52.69, 14.23),
    slot('defend',  52.77, 23.33),
    slot('defend',  54.61, 18.62),
    slot('defend',  53.65,  9.84),
  ],
}

export const LINEOUT_FORMATION: Formation = {
  id: 'builtin-lineout',
  name: 'Lineout',
  category: 'Lineout',
  createdAt: '',
  slots: [
    slot('ball',    31,  7),
    slot('attack',  28,  4), // 2 thrower
    slot('attack',   9, 26), // 9 scrum-half
    slot('attack',  30, 21),
    slot('attack',  30, 26),
    slot('attack',  30, 31),
    slot('attack',  30, 36),
    slot('attack',  30, 41),
    slot('attack',  30, 46),
    slot('attack',  30, 51),
    slot('defend',  44,  4),
    slot('defend',  36, 21),
    slot('defend',  36, 26),
    slot('defend',  36, 31),
    slot('defend',  36, 36),
    slot('defend',  36, 41),
    slot('defend',  36, 46),
    slot('defend',  36, 51),
  ],
}
