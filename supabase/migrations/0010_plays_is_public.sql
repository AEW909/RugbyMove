-- Add is_public column to rugby.plays (was missing from initial migration)
alter table rugby.plays
  add column if not exists is_public boolean not null default false;

create index if not exists plays_public_updated_idx
  on rugby.plays (is_public, updated_at desc);
