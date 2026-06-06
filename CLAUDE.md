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
| Demo (view-only) | `/playbook/demo` |
| Fresh blank board | `/playbook/new` |

Main components:
- **`components/TacticalBoard.tsx`** — top-level board UI, all toolbar/modal rendering (~840 lines)
- **`hooks/useTacticalBoard.ts`** — all board state logic (~620 lines)
- **`components/board/PanelSlideOver.tsx`** — right-side slide panel (save, formations, playbooks)
- **`components/board/FormationLoadDialog.tsx`** — jersey picker modal for loading a formation
- **`components/board/FrameTimeline.tsx`** — frame strip below the board
- **`lib/board/defaults.ts`** — default frame, built-in formations (Scrum, Lineout), token list
- **`lib/board/storage.ts`** — shared types (`Formation`, `FormationSlot`, `FormationCategory`)

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
- `Frame.zones` exists in `types/play.ts` as an optional field (`Zone[]`) for backwards compatibility with existing saved plays.
- There is no current UI for adding or editing zones. The field is preserved in the Zod schema as `.optional()`.
- Do not add UI for zones without discussing it first — this is intentionally dormant.

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

Migrations live in `supabase/migrations/`. Migration 0008 renamed `formations.players` → `formations.slots` and has been applied to the production DB.

---

## Auth

- Master user: `awilkinson@lrgs.org.uk` (password never committed — use env vars or Supabase dashboard)
- No guest/unauthenticated access — all routes redirect to `/login`
- `localStorage` is not used; all data lives in Supabase

---

## Developer Notes

- Run before committing: `npm run typecheck`
- Do not commit `.env.local`, build outputs, `node_modules`, `.next`, or secrets
- The Vercel build runs `tsc --noEmit` — always run typecheck before pushing
- Common past build failures: `zones` field mismatch on `Frame` literals, Zod schema out of sync with types, `normalizeFrame` not handling new fields. Check all three if the build breaks.
- `TacticalBoard.tsx` and `useTacticalBoard.ts` are large files. They are candidates for splitting but this has not been done yet — do not split them unless the user asks.
