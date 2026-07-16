-- Richer, general (not season-only) detail pages. Store the full API statistics
-- blob per player-season (shots, passes, dribbles, duels, tackles, penalties …)
-- plus birth info, and enrich teams with founding year + venue details. Kept
-- additive/nullable so it is backward-compatible and idempotent.
ALTER TABLE players ADD COLUMN IF NOT EXISTS stats JSONB;
ALTER TABLE players ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS birth_place TEXT;

ALTER TABLE teams ADD COLUMN IF NOT EXISTS founded INT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS venue_capacity INT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS venue_image TEXT;
