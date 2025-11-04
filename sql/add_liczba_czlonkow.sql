-- Migration: add liczba_czlonkow to Druzyny and backfill from TeamMembers
-- This migration only adds the column and populates it from existing accepted members.
-- No triggers or server-side validation are created here.

BEGIN;

ALTER TABLE IF EXISTS Druzyny
ADD COLUMN IF NOT EXISTS liczba_czlonkow INT NOT NULL DEFAULT 0;

-- Backfill: set liczba_czlonkow to the count of accepted members per team
UPDATE Druzyny
SET liczba_czlonkow = COALESCE(sub.cnt, 0)
FROM (
  SELECT druzyna_id, COUNT(*) AS cnt
  FROM TeamMembers
  WHERE status = 'accepted'
  GROUP BY druzyna_id
) AS sub
WHERE Druzyny.druzyna_id = sub.druzyna_id;

COMMIT;
