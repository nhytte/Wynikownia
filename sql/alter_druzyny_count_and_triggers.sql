-- Migration: add liczba_czlonkow to Druzyny and triggers to maintain count and enforce limits

BEGIN;

-- 1) Add column to Druzyny
ALTER TABLE Druzyny
ADD COLUMN IF NOT EXISTS liczba_czlonkow INT NOT NULL DEFAULT 0;

-- 2) Create function that prevents accepting a membership if it would exceed discipline-specific limits
CREATE OR REPLACE FUNCTION fn_teammembers_prevent_overflow()
RETURNS TRIGGER AS $$
DECLARE
  d_dyscyplina VARCHAR;
  current_count INT;
  new_would_be_count INT;
  max_allowed INT := NULL;
BEGIN
  -- Only concerned when the new row would be 'accepted'
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'accepted' THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If status didn't change to 'accepted', nothing to check
    IF COALESCE(OLD.status, '') = 'accepted' OR NEW.status IS DISTINCT FROM 'accepted' THEN
      -- if it was already accepted, the count was already counted; if it's not accepted now, no new acceptance
      RETURN NEW;
    END IF;
  END IF;

  -- Lock the team row to avoid race conditions
  SELECT dyscyplina, liczba_czlonkow INTO d_dyscyplina, current_count
  FROM Druzyny
  WHERE druzyna_id = NEW.druzyna_id
  FOR UPDATE;

  IF d_dyscyplina = 'Pilka nozna' THEN
    max_allowed := 16;
  END IF;

  new_would_be_count := COALESCE(current_count, 0) + 1;

  IF max_allowed IS NOT NULL AND new_would_be_count > max_allowed THEN
    RAISE EXCEPTION 'Limit czlonkow dla dyscypliny % wynosi %; aktualna ilosc: %', d_dyscyplina, max_allowed, current_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Create function to keep liczba_czlonkow in sync after inserts/updates/deletes
CREATE OR REPLACE FUNCTION fn_teammembers_adjust_count()
RETURNS TRIGGER AS $$
DECLARE
  delta INT := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'accepted' THEN
      delta := 1;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'accepted' THEN
      delta := -1;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.status, '') <> 'accepted' AND NEW.status = 'accepted' THEN
      delta := 1;
    ELSIF COALESCE(OLD.status, '') = 'accepted' AND NEW.status <> 'accepted' THEN
      delta := -1;
    END IF;
  END IF;

  IF delta <> 0 THEN
    UPDATE Druzyny
    SET liczba_czlonkow = GREATEST(COALESCE(liczba_czlonkow, 0) + delta, 0)
    WHERE druzyna_id = COALESCE(NEW.druzyna_id, OLD.druzyna_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4) Attach triggers
-- Before insert or update: prevent overflow when a membership becomes accepted
DROP TRIGGER IF EXISTS trg_teammembers_prevent_overflow ON TeamMembers;
CREATE TRIGGER trg_teammembers_prevent_overflow
BEFORE INSERT OR UPDATE ON TeamMembers
FOR EACH ROW EXECUTE FUNCTION fn_teammembers_prevent_overflow();

-- After insert/update/delete: adjust counts
DROP TRIGGER IF EXISTS trg_teammembers_adjust_count ON TeamMembers;
CREATE TRIGGER trg_teammembers_adjust_count
AFTER INSERT OR UPDATE OR DELETE ON TeamMembers
FOR EACH ROW EXECUTE FUNCTION fn_teammembers_adjust_count();

COMMIT;
