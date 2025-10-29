-- SQL to create `Druzyny` table for Wynikownia
-- Run this in Supabase SQL editor or psql connected to your database

CREATE TABLE IF NOT EXISTS Druzyny (
  druzyna_id SERIAL PRIMARY KEY,
  nazwa_druzyny VARCHAR(255) NOT NULL,
  logo VARCHAR(255), -- identifier or path to chosen logo
  opis TEXT,
  wojewodztwo VARCHAR(100),
  dyscyplina VARCHAR(50) CHECK (dyscyplina IN ('Pilka nozna', 'Szachy')),
  owner_id VARCHAR(255), -- should reference Uzytkownicy(user_id)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES Uzytkownicy(user_id)
);

-- Optional: index on owner for fast lookups
CREATE INDEX IF NOT EXISTS idx_druzyny_owner_id ON Druzyny(owner_id);
