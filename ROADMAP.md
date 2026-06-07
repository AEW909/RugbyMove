# RugbyMove — Roadmap

## Done

### Board / editor
- Draggable attack/defence tokens with tray staging
- Ball token animates between frames
- Frame capture, delete, reorder (drag timeline)
- Variable frame durations with scrub bar
- Playback interpolation via `requestAnimationFrame`
- Zoom and pan (scroll wheel / pinch; drag when zoomed) — div-size zoom, no CSS transform; landscape + portrait both correct
- Pitch portrait/landscape toggle — coordinates transform across all frames
- **Formation rework** — abstract slot model (no player IDs); jersey picker on load; select-to-save flow; built-in Scrum + Lineout restored; user formations saved to Supabase
- Draw lines tool with colour picker and dashed toggle
- Snap-to-grid toggle (equal physical pixel steps on both axes)
- Pointer / Group-Select (rubber-band) / Draw-line tools; keyboard shortcuts P/G/D/Escape
- Zone overlays — add circular zones, drag (offset-based), resize (drag handle at right edge), rename (double-click label), delete
- Add players dialog — choose which attack/defence tokens appear on the pitch
- Pitch aspect ratio fixed at 12:7 (landscape) / 7:12 (portrait) — no squash or overflow
- GIF export (client-side, via `gifenc`)
- S/M/L token size toggle — player and ball scale independently of zoom
- Player position propagation — moving a player on frame N flows forward to subsequent frames until a barrier (explicit position)
- Arrow key scrubbing — ← / → step through frames
- Thicker pitch lines for improved legibility
- Player/ball tokens fixed size regardless of zoom level

### Save & playbooks
- Save move to Supabase — title, category, description, playbook
- Save as copy (duplicate/variation)
- Duplicate move from playbook list
- Playbooks — create, list, add/remove moves, reorder, organise view
- "Add move to playbook" picker on playbook page
- Playbook access control — invite by username, editor/viewer roles

### Organisations
- Organisations — create, member management (head_coach / coach / player)
- Per-playbook access management from org page — grant/revoke, role toggle
- Join via invite code — joins playbook and parent org

### Platform
- Viewport-fit editor — toolbar + timeline + pitch all on screen without scrolling
- Auto view-only on mobile; view/edit toggle on desktop
- RLS policies — non-recursive org_members, SECURITY DEFINER helpers
- Master user / admin account
- Auth flows — login, signup, recover, account settings, change password

---

## In Progress / Up Next

### 1. Undo / Redo
- Ctrl+Z / Ctrl+Y (and Cmd equivalents) for all board mutations
- Target: frames, player moves, zones, lines — not UI-only state (zoom, tool, panel)

### 2. Org Settings page
- Org name, description, logo/avatar
- Invite link for coaches (not just players)
- Role promotion/demotion (player → coach, etc.)
- Bulk-assign playbook access to all org members

### 3. Player portal / read-only viewer
- Dedicated view for players who have joined via invite code
- Clean playback-only UI — no toolbar clutter
- Show move title, category, description
- Swipe / step through moves in a playbook

---

## Backlog

### Board / editor
- Inline metadata editing — title, category, description editable in the editor header bar
- Arrow/movement trail overlays per token
- Lock a token in place for a frame range

### Playbooks & moves
- Move categories / tags for filtering
- Search across moves
- Public/shared move gallery (opt-in)
- Move comments / coaching notes per frame

### Organisations
- Embed widget for playbooks (share to external sites)

### Export
- Resolution and frame-rate options for GIF download
- Optional: server-side render pipeline for higher-quality output
- Video/WebM export

### Mobile
- Audit viewport-fit layout on phones and tablets
- Touch-friendly token drag on small screens
- Swipe gestures for frame navigation during playback

### Quality & reliability
- Tests: frame deletion, playback interpolation, RLS assumptions
- Error boundaries and user-facing error messages
- Loading skeletons on playbook/org pages
- Rate-limiting on server actions

---

## Deferred / Nice-to-have

- Shared coaching sessions (real-time multiplayer board)
- AI-assisted formation suggestions
