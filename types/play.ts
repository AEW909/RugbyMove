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

export type PlaybookRole = 'owner' | 'coach' | 'player'

export type Playbook = {
  id: string
  owner_id: string
  name: string
  description: string | null
  visibility: 'private' | 'team' | 'public'
  created_at: string
  updated_at: string
}

export type PlaybookMember = {
  id: string
  playbook_id: string
  user_id: string
  role: PlaybookRole
  created_at: string
}
