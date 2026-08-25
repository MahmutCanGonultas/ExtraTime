-- The backfill asks repeatedly for finished fixtures that still lack an event feed
-- or team statistics, never-attempted first. Without an index that sort walks the
-- whole fixtures table every time the batch is refilled, which made the backfill
-- database-bound rather than API-bound — 26 requests a minute against a plan that
-- allows 240.
CREATE INDEX IF NOT EXISTS idx_fixtures_detail_queue
  ON fixtures (detail_synced_at NULLS FIRST, kickoff_at DESC)
  WHERE status IN ('FT', 'AET', 'PEN');
