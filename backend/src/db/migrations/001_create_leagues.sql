-- Competitions we cover (leagues, cups, national-team tournaments alike). One
-- row per competition-SEASON, so historical seasons live alongside the current
-- one — that is why the UNIQUE key is (api_football_id, season). Sync UPSERTs on
-- that key. is_active gates syncing: past seasons and out-of-window competitions
-- stay false and cost zero API requests after their one-time backfill.
CREATE TABLE IF NOT EXISTS leagues (
  id BIGSERIAL PRIMARY KEY,
  api_football_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  country TEXT,
  season INTEGER NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (api_football_id, season)
);
