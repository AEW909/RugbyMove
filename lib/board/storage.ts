import type { PlayCategory } from '@/types/play'

export type FormationCategory = Extract<PlayCategory, 'Scrum' | 'Lineout' | 'Penalty' | 'Open Play'>

export type FormationSlot = {
  side: 'attack' | 'defend' | 'ball'
  x: number
  y: number
}

export type Formation = {
  id: string
  name: string
  category: FormationCategory
  slots: FormationSlot[]
  createdAt: string
}

export const FORMATION_CATEGORIES: FormationCategory[] = [
  'Scrum',
  'Lineout',
  'Penalty',
  'Open Play',
]
