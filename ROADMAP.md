# RugbyMove — Roadmap

## Done

- Draggable attack/defence tokens with tray staging
- Ball token animates between frames
- Frame capture, delete, reorder (drag timeline)
- Variable frame durations
- Playback interpolation via `requestAnimationFrame`
- Zoom and pan on the board
- Pitch portrait/landscape toggle — orientation saved with move
- **Formation rework** — abstract slot model (no player IDs); jersey picker on load; select-to-save flow; built-in Scrum + Lineout restored; user formations saved to Supabase
- Draw lines tool with colour and dashed options
- Snap-to-grid toggle
- Save move to Supabase — title, category, description, playbook
- Save as copy (duplicate/variation)
- Duplicate move from playbook list
- Playbooks — create, list, add/remove moves, reorder, organise view
- Playbook access control — invite by username, editor/viewer roles
- Organisations — create, member management (head_coach / coach / player)
- Per-playbook access management from org page — grant/revoke, role toggle
- Join via invite code — joins playbook and parent org
- Viewport-fit editor — toolbar + timeline + pitch all on screen without scrolling
- RLS policies — non-recursive org_members, SECURITY DEFINER helpers
- Master user / admin account
- Auth flows — login, signup, recover, account settings

---

## In Progress

_(nothing currently active)_

---

## Up Next

### 1. Player portal / read-only viewer
- Dedicated view for players who have joined via code
- Clean playback-only UI — no toolbar clutter
- Show move title, category, description
- Swipe through moves in a playbook

### 2. Inline metadata editing on the board
- Edit title, category, description directly from the editor header bar
- Auto-save on blur (no separate Save panel trip for metadata changes)

### 3. Export quality
- Resolution and frame-rate options for GIF download
- Optional: server-side render pipeline for higher-quality output
- Include pitch lines, token movement and ball in export

---

## Backlog

### Board / editor
- Selection box (drag to select multiple tokens)
- Arrow/movement trail overlays per token
- Undo/redo stack
- Lock a token in place for a frame range

### Playbooks & moves
- Move categories / tags for filtering
- Search across moves
- Public/shared move gallery (opt-in)
- Move comments / coaching notes per frame

### Organisations
- Org-level settings page (name, description, logo)
- Invite link for coaches (not just players)
- Role promotion/demotion from org page (e.g. player → coach)
- Bulk assign playbook access to all org members

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

- Video/WebM export
- Shared coaching sessions (real-time multiplayer board)
- Embed widget for embedding a play in external sites
- AI-assisted formation suggestions
