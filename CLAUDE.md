# RugbyMove — Claude guidance

## Supabase
- Project: **funprojects**
- Schema: **rugby** — all queries and migrations MUST be scoped to this schema
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for client/SSR access; `SUPABASE_SECRET_KEY` for admin actions
- **Do NOT touch any other schema** (e.g. the `minidnd` project/schema shares the same Supabase instance)

## Git
- All development goes directly to `master` — this is a hobby project, no feature branches needed

## Problem solving
- If the correct fix requires a manual change in Supabase (RLS policy, auth setting, schema change that can't go via `apply_migration`, etc.), **stop and tell the user what to do** — do not work around it in code
- Prefer the right solution over a clever workaround; robust and correct beats "it works somehow"

## Stack
- Next.js 14 App Router, TypeScript, Tailwind CSS
- Supabase SSR (`@supabase/ssr`) for auth + data
- Vercel deployment
