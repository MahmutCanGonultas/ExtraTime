-- Goal rows gain the scorer's / assister's API id, so a top-scorer list derived
-- from them can link straight to the player page and its photo.
--
-- Rows written before this (and rows derived from fixture_events, which never
-- carried the id either) stay NULL and fall back to matching on name.
ALTER TABLE fixture_goals ADD COLUMN IF NOT EXISTS player_api_id INTEGER;
ALTER TABLE fixture_goals ADD COLUMN IF NOT EXISTS assist_api_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_fixture_goals_player ON fixture_goals (player_api_id);

-- fixture_goals is about to be derived in bulk from fixture_events, and the
-- top-scorer rebuild reads every goal of a league-season. Both walk goals by
-- fixture, so give that path an index that covers the type filter too.
CREATE INDEX IF NOT EXISTS idx_fixture_events_goals ON fixture_events (fixture_id, type);
