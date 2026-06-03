# RugbyMove

A production-ready Next.js App Router scaffold for a rugby based tactical playbook app.

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
- `NEXT_PUBLIC_SITE_URL`

## Auth and Master User

Apply all migrations in `supabase/migrations`, then create the master user with environment variables:

```bash
set NEXT_PUBLIC_SUPABASE_URL=your-url
set SUPABASE_SECRET_KEY=your-secret-key
set SUPABASE_MASTER_EMAIL=awilkinson@lrgs.org.uk
set SUPABASE_MASTER_PASSWORD=your-password
npm run seed:master-user
```

The password belongs in your local shell or hosting secret manager only. Do not commit it.

The main tactical page is `app/playbook/[id]/page.tsx`.
