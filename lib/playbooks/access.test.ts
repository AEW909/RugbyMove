import { describe, it, expect } from 'vitest'
import { canManagePlaybook, hasPlaybookAccess, isPlayViewOnly } from '@/lib/playbooks/access'

describe('canManagePlaybook', () => {
  it('allows the owner, regardless of membership', () => {
    expect(canManagePlaybook({ isOwner: true, memberRole: null })).toBe(true)
    expect(canManagePlaybook({ isOwner: true })).toBe(true)
  })

  it('allows an editor member', () => {
    expect(canManagePlaybook({ isOwner: false, memberRole: 'editor' })).toBe(true)
  })

  it('denies a viewer member', () => {
    expect(canManagePlaybook({ isOwner: false, memberRole: 'viewer' })).toBe(false)
  })

  it('denies someone with no membership at all', () => {
    expect(canManagePlaybook({ isOwner: false, memberRole: null })).toBe(false)
    expect(canManagePlaybook({ isOwner: false })).toBe(false)
  })
})

describe('hasPlaybookAccess', () => {
  it('allows the owner', () => {
    expect(hasPlaybookAccess({ isOwner: true, memberRole: null })).toBe(true)
  })

  it('allows an editor member', () => {
    expect(hasPlaybookAccess({ isOwner: false, memberRole: 'editor' })).toBe(true)
  })

  it('allows a viewer member (read access is not manage access)', () => {
    expect(hasPlaybookAccess({ isOwner: false, memberRole: 'viewer' })).toBe(true)
  })

  it('denies a non-owner, non-member', () => {
    expect(hasPlaybookAccess({ isOwner: false, memberRole: null })).toBe(false)
    expect(hasPlaybookAccess({ isOwner: false })).toBe(false)
  })
})

describe('isPlayViewOnly', () => {
  it('a fresh (never-saved) play is always editable, even for a stranger', () => {
    expect(isPlayViewOnly({ mode: 'fresh', isOwner: false })).toBe(false)
    expect(isPlayViewOnly({ mode: 'fresh', isOwner: true })).toBe(false)
  })

  it('a saved play is editable by its owner', () => {
    expect(isPlayViewOnly({ mode: 'saved', isOwner: true })).toBe(false)
  })

  it('a saved play is view-only for anyone else', () => {
    expect(isPlayViewOnly({ mode: 'saved', isOwner: false })).toBe(true)
  })
})
