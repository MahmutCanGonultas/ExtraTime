-- Manual point adjustments a platform admin can apply to any member within a
-- group's current game (add or remove points). A positive delta adds points, a
-- negative delta removes them. The season leaderboard sums these on top of the
-- points earned from predictions. Kept as an append-only log so changes are
-- auditable (who, when, why).
CREATE TABLE IF NOT EXISTS point_adjustments (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  season_id BIGINT NOT NULL REFERENCES group_seasons(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta SMALLINT NOT NULL,
  reason TEXT,
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_point_adjustments_season ON point_adjustments (season_id);
