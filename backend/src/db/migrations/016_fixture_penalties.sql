-- Penalty-shootout scores for knockout ties. A fixture that ends level after
-- 90/120 minutes (status PEN) is decided on penalties; goals.home/away only hold
-- the regulation score, so without these columns the shootout winner is unknown.
-- Needed to crown the correct side in the Champions League / World Cup bracket.
ALTER TABLE fixtures
  ADD COLUMN IF NOT EXISTS penalty_home INT,
  ADD COLUMN IF NOT EXISTS penalty_away INT;
