-- Add coach invite code column to organisations
ALTER TABLE rugby.organisations ADD COLUMN IF NOT EXISTS coach_invite_code text;
