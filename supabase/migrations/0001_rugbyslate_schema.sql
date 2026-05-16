create extension if not exists pgcrypto;

create schema if not exists rugby;

grant usage on schema rugby to anon, authenticated, service_role;
alter default privileges in schema rugby grant all on tables to anon, authenticated, service_role;
alter default privileges in schema rugby grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema rugby grant all on functions to anon, authenticated, service_role;

create table if not exists rugby.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  team_name text,
  created_at timestamptz not null default now(),
  constraint username_length check (username is null or char_length(username) between 3 and 32)
);

create table if not exists rugby.plays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references rugby.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text not null,
  animation_data jsonb not null default '{"frames":[]}'::jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plays_title_length check (char_length(title) between 1 and 120),
  constraint plays_category_check check (category in ('Attacking', 'Defending', 'SetPiece')),
  constraint plays_animation_data_object check (jsonb_typeof(animation_data) = 'object')
);

create index if not exists plays_user_id_idx on rugby.plays(user_id);
create index if not exists plays_public_updated_idx on rugby.plays(is_public, updated_at desc);
create index if not exists plays_animation_data_gin_idx on rugby.plays using gin(animation_data);

create or replace function rugby.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_plays_updated_at on rugby.plays;
create trigger set_plays_updated_at
before update on rugby.plays
for each row execute function rugby.set_updated_at();

create or replace function rugby.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = rugby
as $$
begin
  insert into rugby.profiles (id, username, team_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'team_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function rugby.handle_new_user();

alter table rugby.profiles enable row level security;
alter table rugby.plays enable row level security;

drop policy if exists "Profiles are readable by everyone" on rugby.profiles;
create policy "Profiles are readable by everyone"
on rugby.profiles for select
using (true);

drop policy if exists "Users can insert their own profile" on rugby.profiles;
create policy "Users can insert their own profile"
on rugby.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on rugby.profiles;
create policy "Users can update their own profile"
on rugby.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Public plays are readable and owners can read drafts" on rugby.plays;
create policy "Public plays are readable and owners can read drafts"
on rugby.plays for select
using (is_public = true or auth.uid() = user_id);

drop policy if exists "Users can create their own plays" on rugby.plays;
create policy "Users can create their own plays"
on rugby.plays for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own plays" on rugby.plays;
create policy "Users can update their own plays"
on rugby.plays for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own plays" on rugby.plays;
create policy "Users can delete their own plays"
on rugby.plays for delete
using (auth.uid() = user_id);
