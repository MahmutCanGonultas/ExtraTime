-- Full career: every club a player has transferred to/from, from API-Football's
-- /transfers endpoint. Lazily filled the first time a player's detail page is
-- opened, then cached here forever (cache-first). Stats are not needed here — just
-- the clubs + dates so the profile can list every club from the start of the career.
CREATE TABLE IF NOT EXISTS player_transfers (
  id SERIAL PRIMARY KEY,
  player_api_id INTEGER NOT NULL,
  transfer_date DATE,
  type TEXT,
  in_team_api_id INTEGER,
  in_team_name TEXT,
  out_team_api_id INTEGER,
  out_team_name TEXT
);
CREATE INDEX IF NOT EXISTS idx_player_transfers_player ON player_transfers (player_api_id, transfer_date);

-- Tracks which players we have already fetched, so a player with zero transfer
-- records is not re-fetched on every view. A row here means "we tried" (cached).
CREATE TABLE IF NOT EXISTS player_transfer_sync (
  player_api_id INTEGER PRIMARY KEY,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  transfer_count INTEGER NOT NULL DEFAULT 0
);
