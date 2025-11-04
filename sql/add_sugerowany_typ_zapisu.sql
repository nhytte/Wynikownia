-- Add suggested registration type to proposals
-- Run in Postgres / Supabase SQL editor. Test on staging first.
BEGIN;

ALTER TABLE propozycjeturniejow
  ADD COLUMN IF NOT EXISTS sugerowany_typ_zapisu VARCHAR(20)
    CHECK (sugerowany_typ_zapisu IN ('Indywidualny','Drużynowy'));

COMMIT;
