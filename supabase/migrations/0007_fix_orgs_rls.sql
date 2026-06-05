-- Fix RLS for organisations, org_members, and org-scoped playbook access.
-- Uses a security-definer helper to avoid recursive policy evaluation.

CREATE OR REPLACE FUNCTION rugby.get_user_org_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = rugby
AS $$
  SELECT ARRAY(SELECT org_id FROM rugby.org_members WHERE user_id = auth.uid())
$$;

-- ── org_members ───────────────────────────────────────────────────────────────

-- Replace the recursive SELECT policy with a non-recursive one.
DROP POLICY IF EXISTS "org_members_select" ON rugby.org_members;
CREATE POLICY "org_members_select"
  ON rugby.org_members FOR SELECT
  USING (org_id = ANY(rugby.get_user_org_ids()));

-- ── organisations ─────────────────────────────────────────────────────────────

-- Allow any org member (not just owner) to read the org row.
DROP POLICY IF EXISTS "org_members_read_organisations" ON rugby.organisations;
CREATE POLICY "org_members_read_organisations"
  ON rugby.organisations FOR SELECT
  USING (id = ANY(rugby.get_user_org_ids()));

-- ── playbooks ─────────────────────────────────────────────────────────────────

-- Any org member can read all playbooks that belong to their org.
DROP POLICY IF EXISTS "org_members_read_org_playbooks" ON rugby.playbooks;
CREATE POLICY "org_members_read_org_playbooks"
  ON rugby.playbooks FOR SELECT
  USING (org_id IS NOT NULL AND org_id = ANY(rugby.get_user_org_ids()));

-- ── playbook_members cleanup ──────────────────────────────────────────────────

-- Two identical unique constraints were created by previous migrations; drop one.
ALTER TABLE rugby.playbook_members
  DROP CONSTRAINT IF EXISTS playbook_members_playbook_user_unique;
