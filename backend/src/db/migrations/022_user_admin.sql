-- Platform-admin flag on the user itself, so the app owner can promote or
-- demote other admins from the admin panel at runtime — not only via the
-- ADMIN_EMAILS env bootstrap. isPlatformAdmin() is TRUE when a user is listed
-- in ADMIN_EMAILS OR has this flag set.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
