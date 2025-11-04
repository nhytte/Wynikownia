-- Add new columns to Turnieje table
ALTER TABLE Turnieje
ADD COLUMN IF NOT EXISTS czas_rozpoczecia TIME,
ADD COLUMN IF NOT EXISTS czas_zakonczenia TIME,
ADD COLUMN IF NOT EXISTS szczegolowa_lokalizacja VARCHAR(255),
ADD COLUMN IF NOT EXISTS dokladne_miejsce VARCHAR(255),
ADD COLUMN IF NOT EXISTS data_zamkniecia_zapisow TIMESTAMP,
ADD COLUMN IF NOT EXISTS opis_turnieju TEXT,
ADD COLUMN IF NOT EXISTS dlugosc_meczy VARCHAR(50);