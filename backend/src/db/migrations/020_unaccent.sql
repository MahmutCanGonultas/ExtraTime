-- Accent/diacritic-insensitive search: the header search normalises both the
-- stored names and the query with unaccent(), so "Odegaard" finds "Ødegaard",
-- "Sule" finds "Süle", "Guler" finds "Güler" — the special letters are not on a
-- Turkish keyboard.
CREATE EXTENSION IF NOT EXISTS unaccent;
