# RugbyMove

A rugby tactical playbook app — create animated plays, organise them into playbooks, and share with coaches and players.

## Stack

- Next.js 14 App Router with TypeScript (strict)
- Tailwind CSS
- Supabase Auth, Postgres, RLS, and `@supabase/ssr`
- Vercel deployment target
- `lucide-react` icons
- Zod for server action validation
- `requestAnimationFrame` for smooth playback interpolation

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL and keys
npm run dev
```

Environment variables required:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client/SSR access |
| `SUPABASE_SECRET_KEY` | Admin-only server actions |
| `NEXT_PUBLIC_SITE_URL` | Used for auth redirects |

## Database Setup

Apply all migrations in order:

```bash
# using Supabase CLI
supabase db push
```

Or apply `supabase/migrations/*.sql` manually via the Supabase dashboard (SQL editor). All tables live in the **rugby** schema.

## Master User

```bash
set SUPABASE_MASTER_EMAIL=awilkinson@lrgs.org.uk
set SUPABASE_MASTER_PASSWORD=your-password
npm run seed:master-user
```

The password belongs in your shell or secret manager only. Do not commit it.

## Key Routes

| Route | Description |
|---|---|
| `/` | Home dashboard |
| `/playbook/[id]` | Tactical editor |
| `/playbook/new` | Blank board |
| `/playbooks` | Playbook library |
| `/org/[id]` | Organisation management |
| `/login` | Auth entry point |

For architecture details and agent handover notes see [CLAUDE.md](./CLAUDE.md).
For the feature roadmap see [ROADMAP.md](./ROADMAP.md).
