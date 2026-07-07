-- Remove the non-functional "public" surfaces on plays and playbooks.
--
-- Neither was ever backed by an RLS policy: rugby.plays/rugby.formations have
-- a single owner-scoped ALL policy with no is_public read carve-out, and
-- rugby.playbooks has no policy checking visibility at all. So "Public" has
-- been a cosmetic label with no actual sharing effect. Removing it now rather
-- than leaving a decorative toggle around; a real public gallery (with the
-- RLS policy it needs) can be built as a deliberate thin slice later.

alter table rugby.plays drop column if exists is_public;

-- No playbook rows should keep a visibility value we're about to disallow.
update rugby.playbooks set visibility = 'private' where visibility = 'public';

alter table rugby.playbooks drop constraint if exists playbooks_visibility_check;
alter table rugby.playbooks add constraint playbooks_visibility_check
  check (visibility = any (array['private'::text, 'team'::text]));
