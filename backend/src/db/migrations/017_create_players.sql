-- Player profiles + per-league-season stats, so "our leagues" get real player
-- pages (bio, position, appearances, goals, assists) served cache-first from
-- Postgres. Team is denormalised (api id + name) so the roster and profile
-- render a crest without joining the teams table.
CREATE TABLE IF NOT EXISTS players (
  id BIGSERIAL PRIMARY KEY,
  player_api_id INT NOT NULL,
  league_id INT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season INT NOT NULL,
  team_api_id INT,
  team_name TEXT,
  name TEXT NOT NULL,
  firstname TEXT,
  lastname TEXT,
  age INT,
  nationality TEXT,
  position TEXT,
  height TEXT,
  weight TEXT,
  photo_url TEXT,
  appearances INT,
  minutes INT,
  goals INT,
  assists INT,
  yellow_cards INT,
  red_cards INT,
  rating NUMERIC(4, 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_api_id, league_id, season)
);

CREATE INDEX IF NOT EXISTS idx_players_league_season ON players (league_id, season);
CREATE INDEX IF NOT EXISTS idx_players_api_id ON players (player_api_id);
