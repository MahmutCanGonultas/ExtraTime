-- Fixtures = the whole season, past and future. status holds the API-Football
-- short code (NS, 1H, HT, FT, AET, PEN, PST, CANC, ...); we categorize it in code.
-- round is free text ("Regular Season - 12", "Quarter-finals") — never assume a number.
CREATE TABLE IF NOT EXISTS fixtures (
  id BIGSERIAL PRIMARY KEY,
  api_football_id INTEGER NOT NULL UNIQUE,
  league_id BIGINT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  home_team_id BIGINT NOT NULL REFERENCES teams(id),
  away_team_id BIGINT NOT NULL REFERENCES teams(id),
  kickoff_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'NS',
  home_score SMALLINT,
  away_score SMALLINT,
  halftime_home SMALLINT,
  halftime_away SMALLINT,
  round TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hot paths: upcoming-matches queries sort by kickoff, league pages filter by league.
CREATE INDEX IF NOT EXISTS idx_fixtures_kickoff_at ON fixtures (kickoff_at);
CREATE INDEX IF NOT EXISTS idx_fixtures_league_id ON fixtures (league_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_league_status ON fixtures (league_id, status);
