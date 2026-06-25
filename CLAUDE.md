# RugbyMove — Claude handover

This file is the authoritative handover note for future agents. Read it fully before making changes.

See **[ROADMAP.md](./ROADMAP.md)** for the current feature backlog and priorities.

---

## Supabase

- Project: **funprojects** (project ID: `ejjfumclyftxdpblkgfy`)
- Schema: **rugby** — all queries and migrations MUST be scoped to this schema.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — client/SSR access.
- `SUPABASE_SECRET_KEY` — admin-only actions; never commit.
- **Do NOT touch any other schema.** The instance also contains `minidnd` and `PhysioNote` schemas.
- If a correct fix requires a manual Supabase change, stop and tell the user exactly what to do.

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
| Organisations | `/orgs`, `/orgs/new`, `/org/[id]` |
| Player portal (read-only) | `/portal/[id]` |
| Demo (view-only) | `/playbook/demo` |
| Fresh blank board | `/playbook/new` |

Main components (the board was split into focused modules — do not re-merge):
- **`components/TacticalBoard.tsx`** — thin top-level wrapper; composes the toolbar, canvas, panel, and modals (~125 lines)
- **`components/board/TacticalBoardToolbar.tsx`** — all toolbar buttons (play, frame, tools, zones, undo/redo, Present/Exit, etc.)
- **`components/board/PitchCanvas.tsx`** — the pitch SVG + token/zone/line rendering
- **`components/board/PanelSlideOver.tsx`** — right-side slide panel (save, formations, playbooks)
- **`components/board/SaveFormationModal.tsx`** / **`AddPlayersDialog.tsx`** / **`FormationLoadDialog.tsx`** — board modals
- **`components/board/FrameTimeline.tsx`** — frame strip below the board
- **`components/portal/PlayerPortal.tsx`** — read-only step-through viewer for `/portal/[id]`
- **`hooks/useTacticalBoard.ts`** — board state logic (~750 lines)
- **`hooks/usePlayback.ts`** — playback/interpolation loop; **`hooks/useBoardGestures.ts`** — pointer drag/select/draw
- **`lib/board/defaults.ts`** — default frame, built-in formations (Scrum, Lineout), token list
- **`lib/board/frames.ts`** — frame normalization, duration helpers, `rotatePitchCoords`
- **`lib/board/storage.ts`** — shared types (`Formation`, `FormationSlot`, `FormationCategory`)
- **`components/ui/`** — shared UI primitives (`Button`, `Field`, `Banner`, `Collapsible`, etc.)

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
- **Saving a formation**: select players on the board (group-select tool), then click the "Save Formation" toolbar button. The save modal calls `board.saveFormationFromSelection(name, category)`.
- The toolbar also has quick-load "Scrum" and "Lineout" buttons that open the jersey picker for the built-in formations.

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
- `animation_data` structure: `{ frames, durations?, pitchPortrait? }`. No `activePlayers` field — that concept has been removed.

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

### Zod validation (`app/actions/plays.ts`)

`animationDataSchema` must stay in sync with the TypeScript types. This has caused build failures before — if you add fields to `Frame` or `AnimationData`, update the schema too. `zones` is `.optional()` in the schema.

### Database tables (rugby schema)

| Table | Purpose |
|---|---|
| `profiles` | User profile (username, display_name) |
| `plays` | Saved moves with JSONB `animation_data` |
| `formations` | Reusable shapes — `slots` column (JSONB), renamed from `players` in migration 0008 |
| `playbooks` | Named collections; visibility: `private | team | public` |
| `playbook_members` | Roles: `editor | viewer` |
| `playbook_plays` | Ordered join table between playbooks and plays |
| `organisations` | Team/club grouping |
| `org_members` | Roles: `head_coach | coach | player` |

Migrations live in `supabase/migrations/` (0001–0010). Migration `0009` renamed `formations.players` → `formations.slots`; `0010` added `plays.is_public`. All have been applied to production.

**Keep DB and migrations in sync.** Production has occasionally drifted from the migration history (manual changes applied to the live DB without a corresponding file). Any schema change must ship as a numbered migration file AND be applied — do not rely on one without the other. Use the next free number; never reuse an existing one.

---

## Auth

- Master user: `awilkinson@lrgs.org.uk` (password never committed — use env vars or Supabase dashboard)
- No guest/unauthenticated access — all routes redirect to `/login`
- `localStorage` is not used; all data lives in Supabase

---

## Keeping Docs Current

After every session that adds, changes, or removes features:
- Update **CLAUDE.md** — correct any stale behaviour descriptions, component notes, or data model entries.
- Update **ROADMAP.md** — move completed items into Done, update In Progress, adjust Up Next priorities.

Do not leave these files lagging. An inaccurate handover doc is worse than no doc.

## Developer Notes

- Run before committing: `npm run typecheck`
- Do not commit `.env.local`, build outputs, `node_modules`, `.next`, or secrets
- The Vercel build runs `tsc --noEmit` — always run typecheck before pushing
- Common past build failures: `zones` field mismatch on `Frame` literals, Zod schema out of sync with types, `normalizeFrame` not handling new fields. Check all three if the build breaks.
- The board has already been split into focused modules (toolbar, canvas, panel, modals, hooks). `useTacticalBoard.ts` remains the largest file (~750 lines) and holds most state logic — split further only if the user asks.
