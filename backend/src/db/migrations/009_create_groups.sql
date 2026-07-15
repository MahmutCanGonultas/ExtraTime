-- Prediction groups. The creator is the admin. invite_code is the single door
-- into a group and must be unique.
CREATE TABLE IF NOT EXISTS groups (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  admin_user_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Membership. UNIQUE(group_id, user_id) means a user cannot join the same group
-- twice — enforced by the database, not by application code.
CREATE TABLE IF NOT EXISTS group_members (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members (user_id);
