create table if not exists public.formations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  players jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint formations_name_length check (char_length(name) between 1 and 80),
  constraint formations_players_array check (jsonb_typeof(players) = 'array')
);

create index if not exists formations_user_id_updated_idx
on public.formations(user_id, updated_at desc);

drop trigger if exists set_formations_updated_at on public.formations;
create trigger set_formations_updated_at
before update on public.formations
for each row execute function public.set_updated_at();

alter table public.formations enable row level security;

drop policy if exists "Users can read their own formations" on public.formations;
create policy "Users can read their own formations"
on public.formations for select
using (auth.uid() = user_id);

drop policy if exists "Users can create their own formations" on public.formations;
create policy "Users can create their own formations"
on public.formations for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own formations" on public.formations;
create policy "Users can update their own formations"
on public.formations for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own formations" on public.formations;
create policy "Users can delete their own formations"
on public.formations for delete
using (auth.uid() = user_id);
