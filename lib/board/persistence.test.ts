import { describe, it, expect } from 'vitest'
import { resolveSavePlayId, UUID_PATTERN } from '@/lib/board/persistence'

const REAL_UUID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'

describe('UUID_PATTERN', () => {
  it('accepts a canonical v4 UUID', () => {
    expect(UUID_PATTERN.test(REAL_UUID)).toBe(true)
  })

  it('rejects the pseudo-ids used by the fresh and demo boards', () => {
    expect(UUID_PATTERN.test('new')).toBe(false)
    expect(UUID_PATTERN.test('demo')).toBe(false)
  })

  it('rejects a malformed id', () => {
    expect(UUID_PATTERN.test('not-a-uuid')).toBe(false)
    expect(UUID_PATTERN.test('')).toBe(false)
  })
})

describe('resolveSavePlayId', () => {
  it('reuses the id when saving in place onto a real play', () => {
    expect(resolveSavePlayId(REAL_UUID, false)).toBe(REAL_UUID)
  })

  it('returns undefined for "save as copy" even on a real play', () => {
    // Save as copy must always create a new row, never overwrite the original.
    expect(resolveSavePlayId(REAL_UUID, true)).toBeUndefined()
  })

  it('returns undefined when the board is the fresh "new" board', () => {
    expect(resolveSavePlayId('new', false)).toBeUndefined()
  })

  it('returns undefined when the board is the "demo" board', () => {
    expect(resolveSavePlayId('demo', false)).toBeUndefined()
  })

  it('returns undefined when there is no playId at all', () => {
    expect(resolveSavePlayId(undefined, false)).toBeUndefined()
  })
})
