-- Rename formations.players → formations.slots
-- The formation model was reworked to use abstract FormationSlot[]
-- (side + position only, no player IDs) so shapes can be reused with any jersey numbers.

ALTER TABLE rugby.formations DROP CONSTRAINT IF EXISTS formations_players_array;
ALTER TABLE rugby.formations RENAME COLUMN players TO slots;
ALTER TABLE rugby.formations ADD CONSTRAINT formations_slots_array CHECK (jsonb_typeof(slots) = 'array');
