-- Jersey (shirt) number for the "guess the player" game, where a guess is
-- scored on nationality, position, team, age, league AND shirt number. The
-- number comes from the players/squads endpoint (current squad), so it is a
-- per-player attribute rather than per-season and lives directly on the row.
ALTER TABLE players ADD COLUMN IF NOT EXISTS jersey_number INT;
