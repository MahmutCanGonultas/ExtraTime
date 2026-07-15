-- Top scorers snapshot per league. Unlike standings, the *membership* of this
-- list changes over time (a player can drop out of the top ranks), so the sync
-- replaces the whole list per league in a transaction (DELETE + INSERT) rather
-- than UPSERT — otherwise stale players would linger. UNIQUE(league_id, rank)
-- guards against duplicate ranks within a snapshot.
CREATE TABLE IF NOT EXISTS top_scorers (
  id BIGSERIAL PRIMARY KEY,
  league_id BIGINT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  team_id BIGINT REFERENCES teams(id),
  goals INTEGER NOT NULL DEFAULT 0,
  penalties INTEGER,
  appearances INTEGER,
  rank INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (league_id, rank)
);
