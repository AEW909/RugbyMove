alter table public.profiles
add column if not exists is_master boolean not null default false;

create or replace function public.is_master_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_master = true
  );
$$;

drop policy if exists "Public plays are readable and owners can read drafts" on public.plays;
create policy "Public plays are readable and owners can read drafts"
on public.plays for select
using (is_public = true or auth.uid() = user_id or public.is_master_user());

drop policy if exists "Users can read their own formations" on public.formations;
create policy "Users can read their own formations"
on public.formations for select
using (auth.uid() = user_id or public.is_master_user());

drop policy if exists "Master users can read all profiles" on public.profiles;
create policy "Master users can read all profiles"
on public.profiles for select
using (true);
