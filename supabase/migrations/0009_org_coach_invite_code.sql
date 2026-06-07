-- Add coach invite code to organisations so head coaches can invite coaches
-- via a shareable code (separate from the player playbook join code).
ALTER TABLE rugby.organisations ADD COLUMN IF NOT EXISTS coach_invite_code text;
