# RugbyMove — Claude guidance

## Supabase
- Project: **funprojects**
- Schema: **rugby** — all queries and migrations MUST be scoped to this schema
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for client/SSR access; `SUPABASE_SECRET_KEY` for admin actions
- **Do NOT touch any other schema** (e.g. the `minidnd` project/schema shares the same Supabase instance)

## Git
- All development goes directly to `master` — this is a hobby project, no feature branches needed

## Stack
- Next.js 14 App Router, TypeScript, Tailwind CSS
- Supabase SSR (`@supabase/ssr`) for auth + data
- Vercel deployment
