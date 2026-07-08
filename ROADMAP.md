# RugbyMove — Roadmap

> Last reviewed: 2026-07-08, after a recovery audit found (and fixed) a save/load
> corruption bug and a fair amount of doc/code drift — see CLAUDE.md's Supabase
> section for what "drift" meant in practice. The app is a single-owner v1
> coaching tool; the multi-user/organisations layer was removed as unused.
> Remaining work is mostly UX polish, mobile, testing, and export quality.

## Done

### Board / editor
- Draggable attack/defence tokens with tray staging; ball animates between frames
- Frame capture, delete, reorder (drag timeline); variable frame durations with scrub bar
- Playback interpolation via `requestAnimationFrame`
- Zoom and pan (scroll/pinch; drag when zoomed) — div-size zoom, no CSS transform; landscape + portrait both correct
- Pitch portrait/landscape toggle — coordinates transform across all frames
- **Undo / redo** — Ctrl+Z / Ctrl+Y for board mutations (frames, moves, zones, lines)
- Formation rework — abstract slot model (no player IDs); jersey picker on load; save auto-detects players moved off the tray (no manual selection step); built-in Scrum + Lineout; user formations in Supabase
- Formation rotation — slots transform correctly when loaded in portrait
- Draw lines tool with colour picker and dashed toggle
- Snap-to-grid toggle; pointer / group-select / draw tools with P/G/D/Escape shortcuts
- Zone overlays — add, drag, resize, rename (double-click), delete
- Pitch aspect ratio fixed at 12:7 (landscape) / 7:12 (portrait)
- GIF export (client-side, via `gifenc`)
- S/M/L token size toggle; player/ball fixed size regardless of zoom
- Player position propagation; arrow-key frame scrubbing
- Present / Exit toggle — clean view-only presentation mode, **actually always reachable
  as of 2026-07-08** (the Exit button was previously gated on a condition that hid it the
  moment Present mode was entered — no way back except reloading the page; fixed alongside
  the toolbar restructure below)
- Editor refactored into focused modules (`TacticalBoardToolbar`, `PitchCanvas`, `PanelSlideOver`, `FrameTimeline`, hooks)
- **Toolbar restructured** (2026-07-08) — buttons grouped into labeled clusters (Edit,
  Tools, View) instead of one flat row of individually-bordered buttons; fits on one row
  at common desktop widths where the old layout wrapped to two

### Save & playbooks
- Save move to Supabase — title, category, description, playbook
- Save as copy (variation); duplicate move from playbook list
- Playbooks — create, list, add/remove moves, reorder, organise view, move picker; visibility is `private` or `team`
- Playbook access control — invite by username (editor/viewer roles), or a per-playbook `join_code` shared via `/join`
- **Quick save** — Ctrl+S / a header Save button (toolbar, next to Play/Frame) silently
  re-saves to the playbook this move is already associated with (resolved from `?from=`
  or the single playbook it already belongs to), no panel required. Falls back to
  opening the Save panel when no target is known (e.g. a brand-new move)

### Player portal
- `/portal/[id]` — read-only step-through viewer; prev/next + dot navigation
- Shows move title and category; embeds board in view-only playback

### Platform
- Viewport-fit editor; auto view-only on mobile
- RLS policies — simple owner-scoped policies plus a `owns_playbook()` SECURITY DEFINER helper for playbook access checks
- Auth flows — login, signup, recover, account settings, change password

---

## Up Next

### 1. Tests (in progress)
- ✅ Vitest set up; 59 tests across `lib/board/{math,frames,propagation,persistence,schema}.test.ts`
- ✅ Pure logic covered: interpolation, timing, clamp, pitch rotation, frame/duration
  normalization, position propagation + barriers, frame-delete playhead, save-vs-copy id,
  animation_data schema validation (incl. legacy-field tolerance and round-trip integrity)
- ☐ RLS assumptions (owner vs editor vs viewer) — needs a Supabase integration harness
  (test DB or mocked client); larger lift than the pure-logic tests
- ☐ Component/interaction tests (would need jsdom + Testing Library)

### 2. Mobile audit
- Verify viewport-fit layout on phones and tablets
- Touch-friendly token drag on small screens
- Swipe gestures for frame navigation (editor + player portal)

### 3. Inline metadata editing
- Title, category, description editable in the editor header bar (not just the save panel)

---

## Backlog

### Board / editor
- Arrow/movement trail overlays per token
- Lock a token in place for a frame range

### Playbooks & moves
- Move tags / filtering; search across moves — note: per-playbook category
  filtering already exists (`?category=` on `/playbooks/[id]`,
  `PlaybookMovesSection.tsx`), and the "add move" picker has a local text
  search over that playbook's available plays. What's missing is any
  cross-playbook/global search or a tagging system — confirmed via grep,
  2026-07-08.
- Home dashboard's Formations grid is a dead click — `HomeDashboard.tsx`
  pushes `/playbook/new?formation_id=X` when a formation card is clicked, but
  nothing reads `formation_id` anywhere (confirmed via grep, 2026-07-08).
  Flagged during the Slice 1 audit but never made it into this file until now.
  Either wire it up (load the formation into the fresh board) or remove the
  click handler so the card isn't misleadingly clickable.
- Public/shared move gallery (opt-in) — **`is_public` and `playbooks.visibility = 'public'`
  were both removed 2026-07-08** (cosmetic, never backed by an RLS policy, never built
  on). Building this properly means adding the flag/value back **together with** a
  matching RLS policy this time — see CLAUDE.md's Data Model section — not resurrecting
  the old cosmetic version.
- Move comments / coaching notes per frame

### Export
- Resolution / frame-rate options for GIF
- Video / WebM export; optional server-side render pipeline

### Quality & reliability
- ✅ Save failures surface the real error; malformed `animation_data` on load shows an
  explicit error screen instead of silently falling back to defaults (2026-07-07)
- ✅ `rugby.playbook_plays` was missing an UPDATE RLS policy, so any second save to a
  playbook a play was already linked to failed with an RLS violation — fixed in
  migration 0013 (2026-07-08), found while building quick-save
- ✅ Error boundaries for general React render failures — **already existed**
  (`app/error.tsx`, a root-level Next.js error boundary: catches unhandled render
  errors app-wide, shows "Something went wrong" with Try again/Go home, logs to
  console). This item was stale — confirmed present 2026-07-08, predates this
  session. No route-level (nested) error boundaries beyond the root one, if
  finer-grained recovery is ever wanted.
- Loading skeletons on playbook pages
- Rate-limiting on server actions
- Decide whether `playbooks.ts`'s admin-client-for-all-writes pattern is still needed
  now that the organisations layer (which had genuinely policy-less tables) is gone —
  circumstantial evidence suggests it isn't for `playbooks`/`playbook_members`
  specifically, since they have proper owner-scoped RLS policies

---

## Deferred / Nice-to-have

- Shared coaching sessions (real-time multiplayer board)
- AI-assisted formation suggestions
