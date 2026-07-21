-- Trigram fuzzy matching for the "Kim Bu" player search, so a misspelt guess
-- ("onachu" → "Onuachu") still surfaces the player instead of returning nothing.
-- unaccent stays for accent-folding; pg_trgm adds typo tolerance via
-- word_similarity(). We deliberately add NO functional index on unaccent(name)
-- (unaccent is only STABLE, so Postgres rejects it in an index expression); the
-- guess search universe is already filtered by league + current season down to a
-- few-thousand-row scan, which is fine for an autocomplete.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
