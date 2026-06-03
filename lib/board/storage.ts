import type { PlayerPosition, Frame } from '@/types/play'

export type FormationCategory = 'Scrum' | 'Lineout' | 'Penalty' | 'Open Play'

export type Formation = {
  id: string
  name: string
  category: FormationCategory
  players: PlayerPosition[]
  createdAt: string
}

export type SavedMove = {
  id: string
  title: string
  frames: Frame[]
  updatedAt: string
  sourceMoveId?: string
}

export const FORMATION_CATEGORIES: FormationCategory[] = [
  'Scrum',
  'Lineout',
  'Penalty',
  'Open Play',
]

