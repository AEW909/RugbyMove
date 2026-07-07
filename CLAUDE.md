# RugbyMove — Claude handover

This file is the authoritative handover note for future agents. Read it fully before making changes.

See **[ROADMAP.md](./ROADMAP.md)** for the current feature backlog and priorities.

---

## Supabase

- Project: **funprojects** (project ID: `ejjfumclyftxdpblkgfy`)
- Schema: **rugby** — all queries and migrations MUST be scoped to this schema.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — client/SSR access.
- `SUPABASE_SECRET_KEY` — admin-only actions; never commit.
- **Do NOT touch any other schema.** This is a shared instance with several unrelated apps on it (confirmed via migration history — not just `minidnd`/`PhysioNote` as previously noted here, there are more). Stay scoped to `rugby`.
- If a correct fix requires a manual Supabase change, stop and tell the user exactly what to do.
- **Migration history has drifted from the `supabase/migrations/` folder before**, silently. An undocumented migration (`clean_redesign_v2`, applied 2026-05-19, no local file) replaced the old `teams`/`team_members` tables with `organisations`/`org_members`, dropped `profiles.is_master`/`team_name`/`default_team_id`/`default_playbook_id`, and replaced the RLS helper functions with a much simpler `owns_playbook()`. **Do not trust the migration files alone — verify live schema/policies/functions via the Supabase MCP tools (`list_tables`, `pg_policies`, `pg_proc`) before relying on them.**

## Git

- Repo: `https://github.com/AEW909/RugbyMove`
- **Always develop on `master`.** Do not create feature branches unless the user explicitly asks.
- Do not force push.
- Do not run destructive git commands (`reset --hard`, `clean`, `checkout --`, `restore`) unless explicitly instructed.

## Stack

- Next.js 14 App Router
- TypeScript (strict)
- Tailwind CSS
- Supabase SSR (`@supabase/ssr`) for auth and data
- Vercel deployment target (production branch: `master`)
- `lucide-react` icons
- Zod for server action input validation

---

## Current App Shape

| Route | File |
|---|---|
| Home dashboard | `app/page.tsx` |
| Tactical editor | `app/playbook/[id]/page.tsx` |
| Auth/account | `/login`, `/recover`, `/signup`, `/account`, `/account/password` |
| Playbooks | `/playbooks`, `/playbooks/new`, `/playbooks/[id]`, `/playbooks/[id]/organise` |
| Join a playbook by code | `/join` |
| Player portal (read-only) | `/portal/[id]` |
| Demo (view-only) | `/playbook/demo` |
| Fresh blank board | `/playbook/new` |

There is no organisations/squads concept — `/orgs`, `/orgs/new`, and `/org/[id]` were deleted (2026-07-07). Every row in those tables belonged to the app's single owner account; the feature was built but never used by a second person. Playbook sharing itself still works via `playbook_members` (invite by username, editor/viewer roles) and a per-playbook `join_code` (`/join`).

Main components (the board was split into focused modules — do not re-merge):
- **`components/TacticalBoard.tsx`** — thin top-level wrapper; composes the toolbar, canvas, panel, and modals (~125 lines)
- **`components/board/TacticalBoardToolbar.tsx`** — all toolbar buttons (play, frame, tools, zones, undo/redo, Present/Exit, etc.)
- **`components/board/PitchCanvas.tsx`** — the pitch SVG + token/zone/line rendering
- **`components/board/PanelSlideOver.tsx`** — right-side slide panel (save, formations, playbooks)
- **`components/board/SaveFormationModal.tsx`** / **`FormationLoadDialog.tsx`** — board modals
- **`components/board/FrameTimeline.tsx`** — frame strip below the board
- **`components/portal/PlayerPortal.tsx`** — read-only step-through viewer for `/portal/[id]`
- **`hooks/useTacticalBoard.ts`** — board state logic (~670 lines)
- **`hooks/usePlayback.ts`** — playback/interpolation loop; **`hooks/useBoardGestures.ts`** — pointer drag/select/draw
- **`lib/board/defaults.ts`** — default frame, built-in formations (Scrum, Lineout), token list
- **`lib/board/frames.ts`** — frame normalization, duration helpers, `rotatePitchCoords`
- **`lib/board/schema.ts`** — shared Zod `animationDataSchema`, used by both the save action and the play-load page so they validate identically
- **`lib/board/storage.ts`** — shared types (`Formation`, `FormationSlot`, `FormationCategory`)
- **`components/ui/`** — shared UI primitives (`Button`, `Field`, `Banner`, `Collapsible`, etc.)

There is no `AddPlayersDialog` — it was deleted 2026-07-07 along with the `activePlayers` field it powered (see below).

---

## Tactical Board — Current Behaviour

### Players
- All 30 player tokens (15 attack + 15 defence) plus the ball are always on the board.
- They start in off-pitch staging positions: attack at `x=4`, defence at `x=96`.
- Tokens are dragged onto the pitch. There is no "add players" flow — all tokens are always present.
- Attack = blue, defence = red. Ball = white oval.

### Formations
- A formation is an **abstract shape**: `FormationSlot[]` where each slot is `{ side: 'attack' | 'defend' | 'ball', x, y }`. No player IDs are stored.
- Built-in formations (`SCRUM_FORMATION`, `LINEOUT_FORMATION`) live in `lib/board/defaults.ts` as constants — not in the database.
- User formations are saved to Supabase `rugby.formations` with the `slots` column (JSONB array).
- **Loading a formation** opens `FormationLoadDialog`, which lets the user assign jersey numbers to each slot. The dialog produces a `PlayerPosition[]` which is applied to the current frame.
- **Saving a formation**: open the slide-over panel → Formations tab → "+ Save current" → `SaveFormationModal` → name it, pick a category, save. This calls `board.saveFormation()` (`hooks/useTacticalBoard.ts`), which does **not** use the group-select tool or any manual selection — it auto-detects which players have moved off their default tray position (`playersMovedFromDefault` in `lib/board/defaults.ts`) and saves only those (+ the ball) as the formation's slots.
- Built-in "Scrum"/"Lineout" quick-loads live in the same Formations tab, not the toolbar — clicking one opens the jersey picker (`FormationLoadDialog`) same as any saved formation.

### Zones
- `Frame.zones` is an optional `Zone[]` on each frame (`{ id, x, y, r, label }`).
- Zones are fully implemented: add via toolbar button, drag on the board, inline rename (double-click), delete with ✕.
- Zones animate (interpolate position) during playback like players.
- The Zod schema has `zones` as `.optional()` for backwards compatibility with older saved plays that have no zones field.

### Frames & playback
- Frames are captured and deleted via the timeline strip.
- Playback interpolates player positions between frames using `requestAnimationFrame`.
- Draw tool adds `Line[]` per-frame (not interpolated).
- Pitch can be rotated portrait/landscape — all coordinates are transformed on toggle.

### Save flow
- Manual save only (no autosave).
- User opens the slide-over panel → Save tab → picks a playbook → "Save to playbook" (upsert) or "Save as copy" (new play).
- `animation_data` structure: `{ frames, durations?, pitchPortrait? }`. There is no `activePlayers` field and no "active/inactive player" concept anywhere in the app — a token is either in the tray or on the pitch, both are valid positions, and all 30 tokens + ball always render. (An older version of this app had a half-removed `activePlayers` field that gated rendering and caused saved moves to reload with players missing — fixed 2026-07-07, see git history / commit `7c13837` if debugging anything that looks like this again.)
- Save failures surface the actual Zod/Postgres error message, not a generic string. Loading a play with malformed `animation_data` shows an explicit error screen rather than silently falling back to defaults.

---

## Data Model

### Key types (`types/play.ts`)

```ts
Frame         = { players: PlayerPosition[], zones?: Zone[], lines: Line[] }
Zone          = { id, x, y, r, label }   // r = radius as % of board width
AnimationData = { frames, durations?, pitchPortrait? }
```

### Formation types (`lib/board/storage.ts`)

```ts
FormationSlot = { side: 'attack' | 'defend' | 'ball', x: number, y: number }
Formation     = { id, name, category: FormationCategory, slots: FormationSlot[], createdAt }
```

### Zod validation (`lib/board/schema.ts`)

`animationDataSchema` lives in `lib/board/schema.ts`, not inline in `app/actions/plays.ts` — it's imported by both the save action and `app/playbook/[id]/page.tsx` (for load-time validation) so they can't drift apart. It must stay in sync with the TypeScript types in `types/play.ts`. This has caused build failures before — if you add fields to `Frame` or `AnimationData`, update the schema too. `zones` is `.optional()` in the schema (older saves predate zones).

### Database tables (rugby schema)

| Table | Purpose |
|---|---|
| `profiles` | User profile (username, display_name) |
| `plays` | Saved moves with JSONB `animation_data`; `is_public` flag exists but is **not currently enforced by RLS** (see below) |
| `formations` | Reusable shapes — `slots` column (JSONB), renamed from `players` in migration 0009 |
| `playbooks` | Named collections; visibility: `private | team | public`; `join_code` for direct sharing |
| `playbook_members` | Roles: `editor | viewer` — added via username or by joining with `join_code` at `/join` |
| `playbook_plays` | Ordered join table between playbooks and plays |

`organisations` and `org_members` existed but were dropped in migration `0011` (2026-07-07) — every row belonged to the app's single owner account, the feature was never used by a second person. If you're looking for squad/multi-coach grouping, it doesn't exist anymore; playbook-level sharing via `playbook_members`/`join_code` is the only sharing mechanism now.

Migrations live in `supabase/migrations/` (0001–0011, though see the drift warning under Supabase above — the folder is not fully authoritative for what's live). `0009` renamed `formations.players` → `formations.slots`; `0010` added `plays.is_public`; `0011` removed the organisations layer. All have been applied to production.

**Keep DB and migrations in sync.** Production has drifted from the migration history before — see the `clean_redesign_v2` note above. Any schema change must ship as a numbered migration file AND be applied — do not rely on one without the other. Use the next free number; never reuse an existing one.

**Known gap, not yet fixed:** the live RLS policies on `plays` and `formations` are a single `ALL` policy scoped to `user_id = auth.uid()` — there is no policy allowing anyone to read another user's `is_public = true` rows. The "public" visibility option in the save panel and on playbooks is thus currently cosmetic; nothing in the app queries other users' public data yet either (the Backlog's "public move gallery" was never built), so this hasn't caused a visible bug, but building that gallery will require an RLS policy change first.

---

## Auth

- Owner/primary account: `awilkinson@lrgs.org.uk` (password never committed — use env vars or Supabase dashboard)
- No guest/unauthenticated access — all routes redirect to `/login`
- `localStorage` is not used; all data lives in Supabase
- There is no "master user" / admin-bypass mechanism. One existed before an undocumented `clean_redesign_v2` migration (see the drift warning under Supabase above) but was never restored, and the seed script that claimed to set it up (`scripts/create-master-user.mjs`) was deleted 2026-07-07 rather than fixed — it upserted `profiles.is_master`/`profiles.team_name`, neither of which exist on the live schema. If admin/master access is wanted, it's a fresh feature (new migration for the column/function/policies), not a restore.

---

## Keeping Docs Current

After every session that adds, changes, or removes features:
- Update **CLAUDE.md** — correct any stale behaviour descriptions, component notes, or data model entries.
- Update **ROADMAP.md** — move completed items into Done, update In Progress, adjust Up Next priorities.

Do not leave these files lagging. An inaccurate handover doc is worse than no doc.

## Developer Notes

- Run before committing: `npm run typecheck` and `npm test`
- Tests use **Vitest** (`npm test` for a single run, `npm run test:watch` to watch). Specs live next to the code as `*.test.ts` — currently `lib/board/{math,frames,propagation,persistence,schema}.test.ts` (59 tests total). Prefer extracting board logic into pure functions in `lib/board/` (as done for interpolation, propagation, frame-delete, save-id resolution, and schema validation) rather than testing it through the React hook.
- Do not commit `.env.local`, build outputs, `node_modules`, `.next`, or secrets
- The Vercel build runs `tsc --noEmit` — always run typecheck before pushing
- Common past build failures: `zones` field mismatch on `Frame` literals, Zod schema out of sync with types, `normalizeFrame` not handling new fields. Check all three if the build breaks.
- The board has already been split into focused modules (toolbar, canvas, panel, modals, hooks). `useTacticalBoard.ts` remains the largest file (~670 lines) and holds most state logic — split further only if the user asks.
