-- Remembers what the backfill has already asked the API for and come back
-- empty-handed from.
--
-- The backfill is driven by what is MISSING, which works only while "missing"
-- means "not fetched yet". Some of it is missing because the API has nothing
-- either: a club with no venue on record, a competition whose league phase has
-- not started, a season with no registered squad. Those gaps never close, so
-- without a memory they sit at the head of the queue and are re-bought on every
-- run — the three UEFA competitions cost nine requests a run this way while their
-- qualifying rounds were still being played.
--
-- A timestamp rather than a permanent skip, because these gaps DO close
-- eventually (the league phase starts, a squad is registered). Each step sets its
-- own cooldown before trying again.
CREATE TABLE IF NOT EXISTS backfill_attempts (
  scope        TEXT   NOT NULL,
  ref_id       BIGINT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, ref_id)
);
