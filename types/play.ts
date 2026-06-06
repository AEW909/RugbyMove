export type PlayCategory =
  | 'Scrum'
  | 'Lineout'
  | 'Open Play'
  | 'Penalty'
  | 'Kick Off'
  | 'Other'

export type PlayerPosition = {
  id: string
  x: number
  y: number
}

export type Zone = {
  id: string
  x: number
  y: number
  r: number   // radius as % of board width (default 8)
  label: string
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
  zones?: Zone[]
  lines: Line[]
}

export type AnimationData = {
  frames: Frame[]
  durations?: number[]  // ms per segment, length === frames.length - 1
  pitchPortrait?: boolean
  activePlayers?: string[]
}

export type Play = {
  id: string
  user_id: string
  title: string
  description: string | null
  category: PlayCategory
  animation_data: AnimationData
  updated_at: string
  profiles?: {
    username: string | null
  } | null
}

export type PlaybookRole = 'owner' | 'editor' | 'viewer'

export type Playbook = {
  id: string
  owner_id: string
  org_id: string | null
  name: string
  description: string | null
  visibility: 'private' | 'team' | 'public'
  join_code: string | null
  created_at: string
  updated_at: string
}

export type PlaybookMember = {
  id: string
  playbook_id: string
  user_id: string
  role: 'editor' | 'viewer'
  joined_at: string
}

export type OrgRole = 'head_coach' | 'coach' | 'player'

export type OrgMember = {
  org_id: string
  user_id: string
  role: OrgRole
  joined_at: string
}

export type Organisation = {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
  updated_at: string
}
