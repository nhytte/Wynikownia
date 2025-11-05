-- Remove 'Towarzyski' from allowed values of format_rozgrywek
-- Note: Adjust for your actual constraint name if it differs.

ALTER TABLE IF EXISTS turnieje
  DROP CONSTRAINT IF EXISTS turnieje_format_rozgrywek_check;

ALTER TABLE IF EXISTS turnieje
  ADD CONSTRAINT turnieje_format_rozgrywek_check
  CHECK (format_rozgrywek IN ('Pucharowy', 'Liga'));
