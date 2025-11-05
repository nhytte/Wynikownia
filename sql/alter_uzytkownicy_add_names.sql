-- Add first and last name to uzytkownicy (lowercase table name as per repo conventions)
ALTER TABLE IF EXISTS uzytkownicy
  ADD COLUMN IF NOT EXISTS imie VARCHAR(100),
  ADD COLUMN IF NOT EXISTS nazwisko VARCHAR(100);
