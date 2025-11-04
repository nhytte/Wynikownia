-- Add wojewodztwo fields to proposals and tournaments
-- Run this in your Postgres (Supabase) SQL editor. Test on staging or with a DB backup first.
BEGIN;

-- Add suggested province to proposals (if not already present)
ALTER TABLE propozycjeturniejow
  ADD COLUMN IF NOT EXISTS sugerowana_wojewodztwo VARCHAR(255);

-- Add province to official tournaments (if not already present)
ALTER TABLE turnieje
  ADD COLUMN IF NOT EXISTS wojewodztwo VARCHAR(255);

COMMIT;

-- Optional: backfill `turnieje.wojewodztwo` from `propozycjeturniejow` for tournaments created from proposals
-- (Only relevant if you have a way to match proposals -> created tournaments, otherwise skip.)
-- Example (UNTESTED):
-- UPDATE turnieje t
-- SET wojewodztwo = p.sugerowana_wojewodztwo
-- FROM propozycjeturniejow p
-- WHERE p.sugerowany_przez_user_id = t.organizator_id
--   AND p.sugerowana_nazwa = t.nazwa
--   AND p.status = 'Zatwierdzona';

-- If you'd like, I can prepare a more aggressive backfill that derives province from `lokalizacja` using a city->province map.
