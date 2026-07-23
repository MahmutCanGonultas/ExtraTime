-- A tiny key/value store for runtime flags the owner flips WITHOUT a redeploy.
-- Currently holds 'maintenance' = 'on' | 'off': when 'on', the API answers every
-- request with 503 and the frontend shows a full-screen "server error" page, so the
-- whole site reads as down while it's paused. Nothing else is touched — every match,
-- prediction and score row stays exactly as it was. Flip the value back to 'off'
-- (one UPDATE) to bring the site straight back.
CREATE TABLE IF NOT EXISTS app_flags (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
