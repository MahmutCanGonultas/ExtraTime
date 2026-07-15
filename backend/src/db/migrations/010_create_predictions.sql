-- One prediction per user per fixture per group. UNIQUE(user_id, group_id,
-- fixture_id) is what makes the prediction UPSERT work and blocks duplicates at
-- the database level. points_awarded / settled_at stay NULL until the match is
-- settled.
CREATE TABLE IF NOT EXISTS predictions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  fixture_id BIGINT NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  predicted_home SMALLINT NOT NULL,
  predicted_away SMALLINT NOT NULL,
  points_awarded SMALLINT,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, group_id, fixture_id)
);

CREATE INDEX IF NOT EXISTS idx_predictions_fixture ON predictions (fixture_id);
CREATE INDEX IF NOT EXISTS idx_predictions_group ON predictions (group_id);
