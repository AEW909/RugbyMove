-- Fix: rugby.playbook_plays had SELECT/INSERT/DELETE policies but no UPDATE
-- policy. savePlayToPlaybook's upsert (onConflict: playbook_id,play_id) hits
-- the UPDATE path whenever a play is re-saved to a playbook it's already
-- linked to, and RLS default-denies with no UPDATE policy present. Discovered
-- while building the Slice 3 quick-save feature (which exercises exactly this
-- repeat-save path), but it already affected the plain "Save to playbook"
-- button on any second save to the same playbook.

create policy "Owners and editors update play links"
on rugby.playbook_plays for update
using (
  rugby.owns_playbook(playbook_id)
  or playbook_id in (
    select playbook_id from rugby.playbook_members
    where user_id = auth.uid() and role = 'editor'
  )
)
with check (
  rugby.owns_playbook(playbook_id)
  or playbook_id in (
    select playbook_id from rugby.playbook_members
    where user_id = auth.uid() and role = 'editor'
  )
);
