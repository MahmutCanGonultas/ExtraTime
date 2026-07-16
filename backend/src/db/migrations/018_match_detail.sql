-- Detailed summary for finished matches: the full event feed (goals, cards,
-- substitutions) and team statistics (possession, shots, ...). fixture_goals
-- stays as the lightweight goal list used by live cards; these tables power the
-- match page's summary. detail_synced_at marks fixtures already enriched so the
-- job only fetches each once.
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS detail_synced_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS fixture_events (
  id BIGSERIAL PRIMARY KEY,
  fixture_id INT NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  team_api_id INT,
  minute INT,
  extra_minute INT,
  type TEXT NOT NULL,
  detail TEXT,
  player_name TEXT,
  assist_name TEXT,
  sort_order INT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fixture_events_fixture ON fixture_events (fixture_id);

CREATE TABLE IF NOT EXISTS fixture_stats (
  id BIGSERIAL PRIMARY KEY,
  fixture_id INT NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  team_api_id INT NOT NULL,
  type TEXT NOT NULL,
  value TEXT,
  UNIQUE (fixture_id, team_api_id, type)
);
CREATE INDEX IF NOT EXISTS idx_fixture_stats_fixture ON fixture_stats (fixture_id);
