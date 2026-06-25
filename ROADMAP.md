# RugbyMove — Roadmap

> Last reviewed: 2026-06-09. The app is a feature-complete v1 coaching tool.
> Remaining work is mostly polish, mobile, testing, and export quality.

## Done

### Board / editor
- Draggable attack/defence tokens with tray staging; ball animates between frames
- Frame capture, delete, reorder (drag timeline); variable frame durations with scrub bar
- Playback interpolation via `requestAnimationFrame`
- Zoom and pan (scroll/pinch; drag when zoomed) — div-size zoom, no CSS transform; landscape + portrait both correct
- Pitch portrait/landscape toggle — coordinates transform across all frames
- **Undo / redo** — Ctrl+Z / Ctrl+Y for board mutations (frames, moves, zones, lines)
- Formation rework — abstract slot model (no player IDs); jersey picker on load; select-to-save flow; built-in Scrum + Lineout; user formations in Supabase
- Formation rotation — slots transform correctly when loaded in portrait
- Draw lines tool with colour picker and dashed toggle
- Snap-to-grid toggle; pointer / group-select / draw tools with P/G/D/Escape shortcuts
- Zone overlays — add, drag, resize, rename (double-click), delete
- Add players dialog — choose which tokens appear on the pitch
- Pitch aspect ratio fixed at 12:7 (landscape) / 7:12 (portrait)
- GIF export (client-side, via `gifenc`)
- S/M/L token size toggle; player/ball fixed size regardless of zoom
- Player position propagation; arrow-key frame scrubbing
- Present / Exit toggle — clean view-only presentation mode (always reachable)
- Editor refactored into focused modules (`TacticalBoardToolbar`, `PitchCanvas`, `PanelSlideOver`, `FrameTimeline`, hooks)

### Save & playbooks
- Save move to Supabase — title, category, description, **visibility (public/private)**, playbook
- Save as copy (variation); duplicate move from playbook list
- Playbooks — create, list, add/remove moves, reorder, organise view, move picker
- Playbook access control — invite by username, editor/viewer roles

### Organisations
- Organisations — create, member management (head_coach / coach / player)
- Org settings — name, description
- Per-playbook access management from org page — grant/revoke, role toggle
- **Coach invite codes** + player join via invite code (joins playbook and parent org)

### Player portal
- `/portal/[id]` — read-only step-through viewer; prev/next + dot navigation
- Shows move title and category; embeds board in view-only playback

### Platform
- Viewport-fit editor; auto view-only on mobile
- RLS policies — non-recursive org_members, SECURITY DEFINER helpers
- Master user / admin account
- Auth flows — login, signup, recover, account settings, change password

---

## Up Next

### 1. Tests (highest priority — currently zero coverage)
- Pure logic: frame deletion, playback interpolation, position propagation, pitch rotation
- Save-as-copy / variation behaviour
- RLS assumptions (owner vs editor vs viewer vs org member)

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
- Move tags / filtering; search across moves
- Public/shared move gallery (opt-in) — surface the existing `is_public` flag
- Account-page visibility indicator + standalone public/private toggle
  (intentionally deferred — visibility currently set only via the save panel)
- Move comments / coaching notes per frame

### Organisations
- Org logo/avatar
- Bulk-assign playbook access to all org members
- Embed widget for playbooks (share to external sites)

### Export
- Resolution / frame-rate options for GIF
- Video / WebM export; optional server-side render pipeline

### Quality & reliability
- Error boundaries and user-facing error messages
- Loading skeletons on playbook/org pages
- Rate-limiting on server actions

---

## Deferred / Nice-to-have

- Shared coaching sessions (real-time multiplayer board)
- AI-assisted formation suggestions
