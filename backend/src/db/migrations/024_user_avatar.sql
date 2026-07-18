-- Let members pick a fun avatar (a preset id like 'lion' or 'volt'; the emoji +
-- colour mapping lives in the frontend). NULL means "not chosen yet" — the UI
-- then falls back to coloured initials. Kept as free text so adding new presets
-- never needs a migration.
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar text;
