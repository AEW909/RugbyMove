# RugbySlate Clone

A production-ready Next.js App Router scaffold for a RugbySlate.com-style tactical playbook app.

## Stack

- Next.js 14 App Router with TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, RLS, and `@supabase/ssr`
- Vercel deployment target
- `lucide-react` icons
- React state and `requestAnimationFrame` for tactical-board playback

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Apply the Supabase schema in `supabase/migrations/0001_rugbyslate_schema.sql`, then set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` only for trusted server-only maintenance code

The main tactical page is `app/playbook/[id]/page.tsx`.
