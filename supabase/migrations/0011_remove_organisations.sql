-- Slice 2: remove the organisations/org_members multi-user layer.
--
-- Production audit (list_tables / pg_policies / pg_proc, 2026-07-07) confirmed
-- every row in rugby.organisations and rugby.org_members belongs to the app's
-- single owner account — two orgs, both self-owned, zero other members ever
-- added. The feature was built but never used for its purpose. Playbooks and
-- playbook_members (direct playbook sharing via join_code) are unaffected and
-- kept — see app/actions/playbooks.ts for the relocated join/join-code logic
-- that used to live in the now-deleted app/actions/orgs.ts.

drop policy if exists "org_members_read_org_playbooks" on rugby.playbooks;

alter table rugby.playbooks drop column if exists org_id;

drop table if exists rugby.org_members;
drop table if exists rugby.organisations;

drop function if exists rugby.get_user_org_ids();
