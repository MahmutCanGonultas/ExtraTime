-- Teams. We keep only api_football_id (logos are built from it via the media
-- server, which does not count against the daily request limit).
CREATE TABLE IF NOT EXISTS teams (
  id BIGSERIAL PRIMARY KEY,
  api_football_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_name TEXT,
  stadium_name TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
