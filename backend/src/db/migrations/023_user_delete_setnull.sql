-- Allow deleting a user who once added a curated fixture or applied a point
-- adjustment in a group they no longer own. These columns are audit "who did it"
-- pointers, not ownership — so on the user's deletion we NULL them rather than
-- block the delete (the fixture stays in the game, the adjustment keeps its
-- effect on scores; only the attribution becomes "unknown").
ALTER TABLE group_fixtures ALTER COLUMN added_by DROP NOT NULL;
ALTER TABLE group_fixtures DROP CONSTRAINT IF EXISTS group_fixtures_added_by_fkey;
ALTER TABLE group_fixtures ADD CONSTRAINT group_fixtures_added_by_fkey
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE point_adjustments ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE point_adjustments DROP CONSTRAINT IF EXISTS point_adjustments_created_by_fkey;
ALTER TABLE point_adjustments ADD CONSTRAINT point_adjustments_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
