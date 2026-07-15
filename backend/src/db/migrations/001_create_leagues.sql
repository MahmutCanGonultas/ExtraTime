-- Competitions we cover (leagues, cups, national-team tournaments alike).
-- api_football_id is UNIQUE so sync can UPSERT on it. is_active gates syncing:
-- competitions that are out of season stay false and cost zero API requests.
CREATE TABLE IF NOT EXISTS leagues (
  id BIGSERIAL PRIMARY KEY,
  api_football_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country TEXT,
  season INTEGER NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
