-- League table. One row per team per league, kept fresh by UPSERT on
-- (league_id, team_id). The team set is fixed for a season, so UPSERT is enough.
CREATE TABLE IF NOT EXISTS standings (
  id BIGSERIAL PRIMARY KEY,
  league_id BIGINT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id BIGINT NOT NULL REFERENCES teams(id),
  position INTEGER NOT NULL,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  drawn INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  form TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (league_id, team_id)
);
