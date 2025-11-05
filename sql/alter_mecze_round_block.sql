-- Add round and block columns to support dynamic bracket management
ALTER TABLE Mecze
ADD COLUMN IF NOT EXISTS runda INT,
ADD COLUMN IF NOT EXISTS blok INT;

-- Optional: indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_mecze_turniej_runda ON Mecze(turniej_id, runda);
CREATE INDEX IF NOT EXISTS idx_mecze_turniej_blok ON Mecze(turniej_id, blok);
