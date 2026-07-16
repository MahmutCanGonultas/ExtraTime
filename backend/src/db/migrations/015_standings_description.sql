-- The API tags each standings row with a qualification/relegation "description"
-- (e.g. "Round of 16", "Knockout Round Play-offs", "Relegation"). Storing it lets
-- the UI colour the zones — essential for the Champions League Swiss league phase
-- (top 8 -> Round of 16, 9-24 -> play-off, 25-36 -> eliminated) and for domestic
-- promotion/relegation lines.
ALTER TABLE standings ADD COLUMN description TEXT;
