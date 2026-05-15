create table if not exists public.playbooks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint playbooks_name_length check (char_length(name) between 1 and 120),
  constraint playbooks_visibility_check check (visibility in ('private', 'team', 'public'))
);

create table if not exists public.playbook_members (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references public.playbooks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'player',
  created_at timestamptz not null default now(),
  constraint playbook_members_role_check check (role in ('owner', 'coach', 'player')),
  constraint playbook_members_unique unique (playbook_id, user_id)
);

create table if not exists public.playbook_plays (
  playbook_id uuid not null references public.playbooks(id) on delete cascade,
  play_id uuid not null references public.plays(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (playbook_id, play_id)
);

create index if not exists playbooks_owner_updated_idx
on public.playbooks(owner_id, updated_at desc);

create index if not exists playbook_members_user_idx
on public.playbook_members(user_id);

create index if not exists playbook_plays_play_idx
on public.playbook_plays(play_id);

drop trigger if exists set_playbooks_updated_at on public.playbooks;
create trigger set_playbooks_updated_at
before update on public.playbooks
for each row execute function public.set_updated_at();

alter table public.playbooks enable row level security;
alter table public.playbook_members enable row level security;
alter table public.playbook_plays enable row level security;

create or replace function public.can_access_playbook(target_playbook_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.playbooks pb
    where pb.id = target_playbook_id
      and (
        pb.visibility = 'public'
        or pb.owner_id = auth.uid()
        or public.is_master_user()
        or exists (
          select 1
          from public.playbook_members pm
          where pm.playbook_id = pb.id
            and pm.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.can_manage_playbook(target_playbook_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.playbooks pb
    where pb.id = target_playbook_id
      and (
        pb.owner_id = auth.uid()
        or public.is_master_user()
        or exists (
          select 1
          from public.playbook_members pm
          where pm.playbook_id = pb.id
            and pm.user_id = auth.uid()
            and pm.role in ('owner', 'coach')
        )
      )
  );
$$;

drop policy if exists "Accessible playbooks are readable" on public.playbooks;
create policy "Accessible playbooks are readable"
on public.playbooks for select
using (public.can_access_playbook(id));

drop policy if exists "Users can create owned playbooks" on public.playbooks;
create policy "Users can create owned playbooks"
on public.playbooks for insert
with check (auth.uid() = owner_id);

drop policy if exists "Managers can update playbooks" on public.playbooks;
create policy "Managers can update playbooks"
on public.playbooks for update
using (public.can_manage_playbook(id))
with check (public.can_manage_playbook(id));

drop policy if exists "Owners and masters can delete playbooks" on public.playbooks;
create policy "Owners and masters can delete playbooks"
on public.playbooks for delete
using (auth.uid() = owner_id or public.is_master_user());

drop policy if exists "Members can view playbook memberships" on public.playbook_members;
create policy "Members can view playbook memberships"
on public.playbook_members for select
using (public.can_access_playbook(playbook_id));

drop policy if exists "Managers can add playbook memberships" on public.playbook_members;
create policy "Managers can add playbook memberships"
on public.playbook_members for insert
with check (public.can_manage_playbook(playbook_id));

drop policy if exists "Managers can update playbook memberships" on public.playbook_members;
create policy "Managers can update playbook memberships"
on public.playbook_members for update
using (public.can_manage_playbook(playbook_id))
with check (public.can_manage_playbook(playbook_id));

drop policy if exists "Managers can remove playbook memberships" on public.playbook_members;
create policy "Managers can remove playbook memberships"
on public.playbook_members for delete
using (public.can_manage_playbook(playbook_id));

drop policy if exists "Members can view playbook moves" on public.playbook_plays;
create policy "Members can view playbook moves"
on public.playbook_plays for select
using (public.can_access_playbook(playbook_id));

drop policy if exists "Managers can add moves to playbooks" on public.playbook_plays;
create policy "Managers can add moves to playbooks"
on public.playbook_plays for insert
with check (public.can_manage_playbook(playbook_id));

drop policy if exists "Managers can update playbook moves" on public.playbook_plays;
create policy "Managers can update playbook moves"
on public.playbook_plays for update
using (public.can_manage_playbook(playbook_id))
with check (public.can_manage_playbook(playbook_id));

drop policy if exists "Managers can remove moves from playbooks" on public.playbook_plays;
create policy "Managers can remove moves from playbooks"
on public.playbook_plays for delete
using (public.can_manage_playbook(playbook_id));
