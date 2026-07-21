-- A per-group audit trail of admin actions (point adjustments, game create/finish,
-- match add/remove) so members can see WHAT changed and WHICH admin did it.
-- actor_user_id goes NULL if that admin's account is later deleted (the log line
-- stays, just anonymised). `summary` is a ready-to-show Turkish line captured at
-- action time; `action` is the machine key for icons/filtering.
CREATE TABLE IF NOT EXISTS group_audit_log (
  id          BIGSERIAL PRIMARY KEY,
  group_id    BIGINT NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  actor_user_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
  action      TEXT   NOT NULL,
  summary     TEXT   NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_audit_log_group
  ON group_audit_log (group_id, created_at DESC);
