export type PlayCategory = 'Attacking' | 'Defending' | 'SetPiece'

export type PlayerPosition = {
  id: string
  x: number
  y: number
}

export type Line = {
  id: string
  from: { x: number; y: number }
  to: { x: number; y: number }
  color?: string
  dashed?: boolean
}

export type Frame = {
  players: PlayerPosition[]
  lines: Line[]
}

export type AnimationData = {
  frames: Frame[]
}

export type Play = {
  id: string
  user_id: string
  title: string
  description: string | null
  category: PlayCategory
  animation_data: AnimationData
  is_public: boolean
  updated_at: string
  profiles?: {
    username: string | null
    team_name: string | null
  } | null
}
