alter table rugby.profiles
add column if not exists is_master boolean not null default false;

create or replace function rugby.is_master_user()
returns boolean
language sql
stable
security definer
set search_path = rugby
as $$
  select exists (
    select 1
    from rugby.profiles
    where id = auth.uid()
      and is_master = true
  );
$$;

drop policy if exists "Public plays are readable and owners can read drafts" on rugby.plays;
create policy "Public plays are readable and owners can read drafts"
on rugby.plays for select
using (is_public = true or auth.uid() = user_id or rugby.is_master_user());

drop policy if exists "Users can read their own formations" on rugby.formations;
create policy "Users can read their own formations"
on rugby.formations for select
using (auth.uid() = user_id or rugby.is_master_user());

drop policy if exists "Master users can read all profiles" on rugby.profiles;
create policy "Master users can read all profiles"
on rugby.profiles for select
using (true);
