-- Game redesign + richer live data.
--
-- The group game is now leader-curated and runs in "seasons": each season is one
-- game the group leader sets up (picks matches, members predict, a champion is
-- crowned at the end). A group runs many seasons over time — the active one is
-- the current game, finished ones form the group's history.

CREATE TABLE IF NOT EXISTS group_seasons (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  champion_user_id BIGINT,
  champion_points SMALLINT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_group_seasons_group ON group_seasons (group_id);

-- Backfill: give every existing group an active first season so old data keeps
-- working under the new model.
INSERT INTO group_seasons (group_id, title, status)
SELECT id, '1. Oyun', 'active' FROM groups;

-- The leader hand-picks which matches count in a season. Members predict ONLY
-- these fixtures. UNIQUE blocks adding the same match to a season twice.
CREATE TABLE IF NOT EXISTS group_fixtures (
  id BIGSERIAL PRIMARY KEY,
  season_id BIGINT NOT NULL REFERENCES group_seasons(id) ON DELETE CASCADE,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  fixture_id BIGINT NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  added_by BIGINT NOT NULL REFERENCES users(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, fixture_id)
);
CREATE INDEX IF NOT EXISTS idx_group_fixtures_season ON group_fixtures (season_id);
CREATE INDEX IF NOT EXISTS idx_group_fixtures_group ON group_fixtures (group_id);

-- Predictions: the primary pick is now the match outcome (HOME/DRAW/AWAY); the
-- exact score is OPTIONAL, so predicted_home / predicted_away may be null.
ALTER TABLE predictions ADD COLUMN predicted_outcome TEXT;
UPDATE predictions SET predicted_outcome = CASE
  WHEN predicted_home > predicted_away THEN 'HOME'
  WHEN predicted_home < predicted_away THEN 'AWAY'
  ELSE 'DRAW' END
WHERE predicted_outcome IS NULL;
ALTER TABLE predictions ALTER COLUMN predicted_home DROP NOT NULL;
ALTER TABLE predictions ALTER COLUMN predicted_away DROP NOT NULL;

-- Live match minute (e.g. 67') for in-progress fixtures.
ALTER TABLE fixtures ADD COLUMN elapsed SMALLINT;

-- Who scored: goal events for a fixture, refreshed live and kept after the match
-- ends. Replaced wholesale per fixture on each sync so VAR reversals self-heal.
CREATE TABLE IF NOT EXISTS fixture_goals (
  id BIGSERIAL PRIMARY KEY,
  fixture_id BIGINT NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  team_api_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  assist_name TEXT,
  minute SMALLINT,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_fixture_goals_fixture ON fixture_goals (fixture_id);

-- Player photos for the top-scorer / assist spotlights.
ALTER TABLE top_scorers ADD COLUMN player_api_id INTEGER;
ALTER TABLE top_assists ADD COLUMN player_api_id INTEGER;
