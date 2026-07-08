export type MemberRole = 'editor' | 'viewer'

/** Owner or an editor member can manage a playbook's contents/access. */
export function canManagePlaybook(params: { isOwner: boolean; memberRole?: MemberRole | string | null }): boolean {
  return params.isOwner || params.memberRole === 'editor'
}

/** Owner or any member (editor or viewer) can read a playbook (e.g. the player portal). */
export function hasPlaybookAccess(params: { isOwner: boolean; memberRole?: MemberRole | string | null }): boolean {
  return params.isOwner || params.memberRole != null
}

/** A saved play is editable only by its owner; a fresh (never-saved) one is always editable. */
export function isPlayViewOnly(params: { mode: 'fresh' | 'saved'; isOwner: boolean }): boolean {
  return params.mode === 'saved' && !params.isOwner
}
