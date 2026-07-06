/** Matches a canonical v1–v5 UUID (the shape Supabase issues for play ids). */
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Decide which id a save should target.
 *
 * Returns the existing play id (→ upsert / overwrite) only when saving in place
 * onto a genuinely persisted play. Returns `undefined` (→ insert a new row) when:
 *  - `asCopy` is set ("Save as copy" always creates a new play), or
 *  - the current `playId` is not a real UUID — e.g. the `new` or `demo` boards,
 *    which must never overwrite anything.
 */
export function resolveSavePlayId(
  playId: string | undefined,
  asCopy: boolean,
): string | undefined {
  if (asCopy) return undefined
  if (playId && UUID_PATTERN.test(playId)) return playId
  return undefined
}
