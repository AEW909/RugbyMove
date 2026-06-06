# RugbyMove - Claude guidance

This file is a handover note so a future agent can regain context quickly.

## Supabase

- Project: **funprojects** (project ID: `ejjfumclyftxdpblkgfy`)
- Schema: **rugby** — all queries and migrations MUST be scoped to this schema.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is for client/SSR access.
- `SUPABASE_SECRET_KEY` is for admin-only actions.
- **Do NOT touch any other schema.** The instance also contains `minidnd` and `PhysioNote` schemas.
- If a correct fix requires a manual Supabase change that cannot safely go through migrations, stop and tell the user exactly what to do.

## Git

- Repo: `https://github.com/AEW909/RugbyMove`
- **Always develop on `master`.** Do not create feature branches unless the user explicitly asks.
- Do not force push.
- Do not run destructive git commands (`reset`, `clean`, `checkout --`, `restore`) unless explicitly instructed.

## Stack

- Next.js 14 App Router
- TypeScript (strict)
- Tailwind CSS
- Supabase SSR (`@supabase/ssr`) for auth and data
- Vercel deployment target (production branch: `master`)
- `lucide-react` icons
- Zod for server action input validation

## Current App Shape

- Home dashboard: `app/page.tsx`
- Tactical editor: `app/playbook/[id]/page.tsx`
- Main board UI: `components/TacticalBoard.tsx`
- Board logic hook: `hooks/useTacticalBoard.ts`
- Auth/account: `/login`, `/recover`, `/signup`, `/account`, `/account/password`
- Playbooks: `/playbooks`, `/playbooks/new`, `/playbooks/[id]`
- Organisations: `/orgs`, `/orgs/new`, `/org/[id]`
- Demo route: `/playbook/demo`
- Fresh blank board: `/playbook/new`

## Tactical Board — Current Behavior

`components/TacticalBoard.tsx` is a large client component (~930 lines). Its state logic lives in `hooks/useTacticalBoard.ts` (~800 lines). Both are candidates for a refactor into smaller focused files.

### Player model
- The board starts **empty** (just the ball). Players are added explicitly via "Add players" button → `AddPlayersDialog`.
- Attack players are blue tokens, defence are red. Ball is a white oval.
- Players are staged in off-pitch tray positions (`x=4` for attack, `x=96` for defence) until dragged onto the pitch.
- `activePlayers: string[]` in state tracks which player IDs have been added. Stored in `animation_data.activePlayers`.
- All 30 player positions are always present in frame data; rendering filters by `activePlayers`.

### Zones
- Zones are draggable labelled circles added via "Zone" toolbar button.
- Stored per-frame in `Frame.zones` — they animate between frames like players.
- Adding a zone inserts it into **all** frames at the same position; moving it only updates the active frame.
- Double-click label to rename inline. × button to delete from all frames.

### Frames & playback
- Frames can be added (capture) and deleted.
- Playback interpolates player and zone positions between frames using `requestAnimationFrame`.
- Draw tool adds lines per-frame. Lines are not interpolated.
- Pitch can be rotated portrait/landscape — all coordinates are transformed on toggle.

### Dirty state
- `isDirty` in the hook tracks unsaved changes since last save.
- An amber "Unsaved changes" pill appears in the toolbar.
- `beforeunload` warns the user if they try to close the tab with unsaved edits.
- `isDirty` resets to false after a successful save.

### Save flow
- Manual save only (no autosave). User opens the slide-over panel → Save tab → picks a playbook → clicks "Save to playbook" (updates existing) or "Save as copy" (new play).
- `animation_data` stores: `frames`, `durations`, `pitchPortrait`, `activePlayers`.

### Formations
- A formation is a **sparse** group of players at specific positions — only active players are saved, not all 30.
- Loading a formation adds its player IDs to `activePlayers` AND positions them in the current frame.
- The panel shows a compact summary (e.g. `Att 1–8 · Def 1–8`) under each formation name.
- Old formation data was deleted from the DB when the model changed. There is no legacy compatibility.

## Data Model

### Key types (`types/play.ts`)
```ts
Frame = { players: PlayerPosition[], zones: Zone[], lines: Line[] }
Zone  = { id, x, y, r, label }  // r = radius as % of board width
AnimationData = { frames, durations?, pitchPortrait?, activePlayers? }
```
`Frame.zones` is **required** (not optional). `AnimationData.activePlayers` is optional (absence means no players added yet for fresh plays; legacy plays with undefined will open with an empty board).

### Zod validation
`app/actions/plays.ts` contains `animationDataSchema` which must stay in sync with the TypeScript types. This has been a source of build failures — if you add fields to `Frame` or `AnimationData`, update the schema too.

### Database tables (rugby schema)
- `profiles` — user profile (username, display_name)
- `plays` — saved tactical moves with JSONB `animation_data`
- `formations` — sparse player groups (reusable starting positions)
- `playbooks` — named collections of moves; visibility: `private | team | public`
- `playbook_members` — roles: `editor | viewer`
- `playbook_plays` — ordered join table between playbooks and plays
- `organisations` — team/club level grouping
- `org_members` — roles: `head_coach | coach | player`

Migrations live in `supabase/migrations`.

## Auth

- Master user: `awilkinson@lrgs.org.uk` (password never committed)
- No guest/unauthenticated access — all routes redirect to `/login`
- localStorage is not used; all data lives in Supabase

## Recommended Next Steps

1. **Full refactor** (agreed as next priority):
   - Split `useTacticalBoard.ts` into focused hooks (`usePlayback`, `useZones`, `usePlayers`, `useSave`)
   - Split `TacticalBoard.tsx` into focused components (`BoardCanvas`, `BoardToolbar`)
   - Derive `SavePlayInput` from `AnimationData` type rather than maintaining a parallel Zod schema
   - Remove dead code: `SCRUM_FORMATION`, `LINEOUT_FORMATION` in `lib/board/defaults.ts` (no longer used), unused `saveFormationAction` import in hook

2. **Public share page** — playbooks have a `visibility` flag but no public read-only URL yet

3. **Export upgrade** — current export is an animated SVG; upgrade to WebM/GIF

4. **Tests** — frame deletion, playback interpolation, save flow, RLS assumptions

## Developer Notes

- Before committing: `npm run typecheck` (lint binary not available in this environment)
- Do not commit `.env.local`, build outputs, `node_modules`, `.next`, or secrets
- The Vercel build runs `tsc --noEmit` — type errors that pass locally can still fail on Vercel if the local tsconfig differs. Always run typecheck before pushing.
- Build has previously failed due to: missing `zones` on `Frame` literals, Zod schema out of sync with types, `normalizeFrame` not included in call sites. Check all three if the build breaks again.
