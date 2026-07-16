-- Each member may secretly pick ONE match per game (season) as their "joker":
-- that match's earned points count double. One joker per member per season
-- (UNIQUE), changeable until that match locks. The 2x multiplier is applied at
-- settle time so the pure, unit-tested scoring function stays untouched.
CREATE TABLE IF NOT EXISTS season_jokers (
  id BIGSERIAL PRIMARY KEY,
  season_id BIGINT NOT NULL REFERENCES group_seasons(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fixture_id BIGINT NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_season_jokers_fixture ON season_jokers (fixture_id);
