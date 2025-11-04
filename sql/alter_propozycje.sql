-- Add new columns to PropozycjeTurniejow table
ALTER TABLE PropozycjeTurniejow
ADD COLUMN IF NOT EXISTS sugerowana_szczegolowa_lokalizacja VARCHAR(255),
ADD COLUMN IF NOT EXISTS sugerowane_dokladne_miejsce VARCHAR(255),
ADD COLUMN IF NOT EXISTS sugerowany_czas_rozpoczecia TIME,
ADD COLUMN IF NOT EXISTS sugerowany_czas_zakonczenia TIME,
ADD COLUMN IF NOT EXISTS sugerowana_data_zamkniecia_zapisow TIMESTAMP,
ADD COLUMN IF NOT EXISTS sugerowany_format_rozgrywek VARCHAR(20),
ADD COLUMN IF NOT EXISTS sugerowana_dlugosc_meczy VARCHAR(50),
ADD COLUMN IF NOT EXISTS sugerowany_max_uczestnikow INT;