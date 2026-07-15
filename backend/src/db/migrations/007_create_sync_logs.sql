-- Every sync run writes one row here: when it ran, how many records it wrote,
-- how many API requests it spent, and whether it succeeded. This makes both
-- the daily API budget and sync health observable (admin panel reads this).
CREATE TABLE IF NOT EXISTS sync_logs (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  records_upserted INTEGER NOT NULL DEFAULT 0,
  api_requests_used INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_ran_at ON sync_logs (ran_at DESC);
