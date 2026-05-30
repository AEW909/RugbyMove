# RugbyMove - Claude guidance

This file is a handover note so a future agent can regain context after a local Codex reinstall/reset.

## Supabase

- Project: **funprojects**
- Schema: **rugby** - all queries and migrations MUST be scoped to this schema.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is for client/SSR access.
- `SUPABASE_SECRET_KEY` is for admin-only actions.
- **Do NOT touch any other schema**. The Supabase instance may also contain unrelated schemas such as `minidnd`.
- If a correct fix requires a manual Supabase change that cannot safely go through migrations or `apply_migration`, stop and tell the user exactly what to do. Do not work around it in code.

## Git

- Repo: `https://github.com/AEW909/RugbyMove`
- Branch: `master`
- All development goes directly to `master`; this is a hobby project, no feature branches needed unless the user asks.
- Do not force push.
- Do not run destructive commands such as `git reset`, `git clean`, `git checkout --`, or `git restore` unless explicitly instructed.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase SSR (`@supabase/ssr`) for auth and data
- Vercel deployment target
- `lucide-react` icons

## Current App Shape

- Home dashboard: `app/page.tsx`
- Tactical editor: `app/playbook/[id]/page.tsx`
- Main board UI: `components/TacticalBoard.tsx`
- Auth/account:
  - `/login`
  - `/recover`
  - `/signup`
  - `/account`
  - `/account/password`
- Playbooks:
  - `/playbooks`
  - `/playbooks/new`
  - `/playbooks/[id]`
- Organization/team paths may exist in the current remote branch; inspect before editing.
- Demo route: `/playbook/demo`
- Fresh blank board: `/playbook/new`
- Local saved move handoff: `/playbook/local`

## Tactical Board Behavior

`components/TacticalBoard.tsx` is a client component.

Implemented behavior from the design iterations:

- Attack and defence players are draggable tokens.
- Ball starts on the centre spot.
- Attack and defence players start in narrow side trays.
- Attack tray is left, defence tray is right.
- Players are staged in tray columns.
- Tray labels should sit at the outer edges.
- Frames can be added and deleted.
- Playback interpolates token positions between frames with `requestAnimationFrame`.
- Dotted pass lines were removed because the ball itself animates.
- Export currently downloads an animated SVG, not GIF/video.

Important implementation detail:

- Board positions use pitch-relative coordinates where `x = 0..100` maps to the pitch.
- Off-pitch staging is represented by values outside that pitch range.
- The visual stage reserves internal tray space and maps pitch coordinates into the central pitch rectangle via `pitchLeft` and `pitchWidth`.

## Database Model

Migrations live in `supabase/migrations`.

Known migration intent:

- `profiles`: user profile data, including master-user/admin status.
- `plays`: saved tactical moves with JSON animation data.
- `formations`: reusable starting positions.
- `playbooks`: collections of moves.
- `playbook_members`: access roles for coaches/players.
- `playbook_plays`: ordered moves inside playbooks.
- Later migrations in the remote branch add team/organization concepts; inspect `supabase/migrations` before editing policies.

Long-term structure:

- Moves belong to playbooks.
- Coaches can be granted access to specific playbooks.
- Players can receive shared/read-only access to selected moves/playbooks.
- Master user can see all saved moves across accounts.
- Users can save a move, save a variation, and organize variations into playbooks.

## Auth / Master User

The requested master user email is:

- `awilkinson@lrgs.org.uk`

The password was shared in chat but must never be committed.

Use env vars or Supabase dashboard/admin tooling to create or update the user. If using the repo script, it reads:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_MASTER_EMAIL`
- `SUPABASE_MASTER_PASSWORD`

Never hardcode secrets into source files or documentation.

## Local Persistence Caveat

Some editor/home prototype features may still use browser `localStorage`, for example:

- `rugbyslate.moves.v1`
- `rugbyslate.formations.v1`
- `rugbyslate.pendingFormation.v1`
- `rugbyslate.pendingMove.v1`

These are not durable through browser/app reset. The intended direction is to move saved moves, formations, playbooks, and access control fully into Supabase.

## Recommended Next Steps

1. Confirm the correct Supabase project/schema before applying any migrations.
2. Apply pending migrations only to the `rugby` schema.
3. Finish Supabase-backed playbook UI:
   - create playbook
   - list user playbooks
   - add/remove moves from playbooks
   - invite/add coach/player members
4. Replace remaining local saved moves/formations with Supabase queries.
5. Add a proper editor metadata panel:
   - title
   - category
   - description
   - playbook selector
   - public/private/share state
6. Upgrade export:
   - client-side WebM/GIF renderer or server-side rendering pipeline
   - include pitch, token movement, and ball movement
7. Add tests around:
   - frame deletion
   - playback interpolation
   - save-as variation behavior
   - playbook access/RLS assumptions

## Developer Notes

- On Windows, use `cmd /c npm.cmd ...` if PowerShell blocks npm scripts.
- Run before committing code changes:

```bash
cmd /c npm.cmd run typecheck
cmd /c npm.cmd run lint
```

- Do not commit `.env.local`, build outputs, logs, caches, `node_modules`, `.next`, or secrets.
- Prefer the correct fix over clever workarounds; robust and correct beats "it works somehow".
