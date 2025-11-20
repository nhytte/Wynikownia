-- Drop the unique constraint on (turniej_id, user_id) to allow an owner to register multiple teams in the same tournament.
-- This is useful for testing/validation or for owners managing multiple teams.

ALTER TABLE Zapisy DROP CONSTRAINT IF EXISTS zapisy_turniej_id_user_id_key;

-- We might want to ensure unique team names per tournament instead, but for now we just drop the user restriction.
-- ALTER TABLE Zapisy ADD CONSTRAINT zapisy_turniej_id_nazwa_druzyny_key UNIQUE (turniej_id, nazwa_druzyny);
