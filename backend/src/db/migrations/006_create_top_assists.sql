-- Top assists snapshot per league. Same DELETE + INSERT strategy as top_scorers.
CREATE TABLE IF NOT EXISTS top_assists (
  id BIGSERIAL PRIMARY KEY,
  league_id BIGINT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  team_id BIGINT REFERENCES teams(id),
  assists INTEGER NOT NULL DEFAULT 0,
  appearances INTEGER,
  rank INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (league_id, rank)
);
