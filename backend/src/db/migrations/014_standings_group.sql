-- Tournament standings (World Cup, etc.) are split into groups (Group A, B, ...),
-- each with its own 1..N ranking. We keep the API's group label per row so the UI
-- can render separate group tables instead of one flat, wrong-looking league table.
-- For normal leagues the label is just the league name (a single group).
ALTER TABLE standings ADD COLUMN group_label TEXT;
