-- Fix 1: Infinite recursion in teams RLS
-- team_members_select queries team_members, team_owners_manage_members queries teams → circular loop
-- Solution: security definer helpers that bypass RLS to break the cycle

CREATE OR REPLACE FUNCTION rugby.get_user_team_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = rugby AS $$
  SELECT team_id FROM rugby.team_members WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION rugby.get_owned_team_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = rugby AS $$
  SELECT id FROM rugby.teams WHERE owner_id = auth.uid()
$$;

DROP POLICY IF EXISTS "team_members_select" ON rugby.teams;
CREATE POLICY "team_members_select"
  ON rugby.teams FOR SELECT
  USING (id IN (SELECT rugby.get_user_team_ids()));

DROP POLICY IF EXISTS "team_owners_manage_members" ON rugby.team_members;
CREATE POLICY "team_owners_manage_members"
  ON rugby.team_members FOR ALL
  USING  (team_id IN (SELECT rugby.get_owned_team_ids()))
  WITH CHECK (team_id IN (SELECT rugby.get_owned_team_ids()));

-- Fix 2: Auto-create default team and playbook for every new user
CREATE OR REPLACE FUNCTION rugby.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = rugby
AS $$
DECLARE
  new_team_id uuid;
  new_playbook_id uuid;
BEGIN
  INSERT INTO rugby.profiles (id, username, team_name)
  VALUES (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'team_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO rugby.teams (name, owner_id)
  VALUES ('My Team', new.id)
  RETURNING id INTO new_team_id;

  INSERT INTO rugby.playbooks (name, owner_id, visibility)
  VALUES ('My Playbook', new.id, 'private')
  RETURNING id INTO new_playbook_id;

  UPDATE rugby.profiles
  SET default_team_id = new_team_id,
      default_playbook_id = new_playbook_id
  WHERE id = new.id;

  RETURN new;
END;
$$;

-- Fix 3: Backfill existing accounts with no default team/playbook
DO $$
DECLARE
  r RECORD;
  new_team_id uuid;
  new_playbook_id uuid;
BEGIN
  FOR r IN
    SELECT id FROM rugby.profiles WHERE default_team_id IS NULL
  LOOP
    INSERT INTO rugby.teams (name, owner_id)
    VALUES ('My Team', r.id)
    RETURNING id INTO new_team_id;

    INSERT INTO rugby.playbooks (name, owner_id, visibility)
    VALUES ('My Playbook', r.id, 'private')
    RETURNING id INTO new_playbook_id;

    UPDATE rugby.profiles
    SET default_team_id = new_team_id,
        default_playbook_id = new_playbook_id
    WHERE id = r.id;
  END LOOP;
END;
$$;
