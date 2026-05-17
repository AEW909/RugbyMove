-- Teams: top-level grouping for playbooks and players
CREATE TABLE IF NOT EXISTS rugby.teams (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  owner_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_teams_updated_at
  BEFORE UPDATE ON rugby.teams
  FOR EACH ROW EXECUTE FUNCTION rugby.set_updated_at();

-- Team membership (used now for coaches, later for player portal)
CREATE TABLE IF NOT EXISTS rugby.team_members (
  team_id    uuid NOT NULL REFERENCES rugby.teams(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'player' CHECK (role IN ('coach', 'player')),
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- Link playbooks to a team (optional — personal playbooks have team_id NULL)
ALTER TABLE rugby.playbooks
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES rugby.teams(id) ON DELETE SET NULL;

-- Default selections stored on the coach's profile
ALTER TABLE rugby.profiles
  ADD COLUMN IF NOT EXISTS default_team_id     uuid REFERENCES rugby.teams(id)     ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_playbook_id uuid REFERENCES rugby.playbooks(id) ON DELETE SET NULL;

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE rugby.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE rugby.team_members ENABLE ROW LEVEL SECURITY;

-- Team owners have full access to their own teams
CREATE POLICY "team_owners_all"
  ON rugby.teams FOR ALL
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Members can read teams they belong to
CREATE POLICY "team_members_select"
  ON rugby.teams FOR SELECT
  USING (
    id IN (SELECT team_id FROM rugby.team_members WHERE user_id = auth.uid())
  );

-- Owners can manage membership of their teams
CREATE POLICY "team_owners_manage_members"
  ON rugby.team_members FOR ALL
  USING  (team_id IN (SELECT id FROM rugby.teams WHERE owner_id = auth.uid()))
  WITH CHECK (team_id IN (SELECT id FROM rugby.teams WHERE owner_id = auth.uid()));

-- Members can view their own membership rows
CREATE POLICY "team_members_view_own"
  ON rugby.team_members FOR SELECT
  USING (user_id = auth.uid());
