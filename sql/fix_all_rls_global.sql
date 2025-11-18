-- Fix RLS for ALL tables
-- This script enables RLS and sets permissive policies for all tables to allow public access.
-- This is necessary because the application uses Auth0 for authentication and Supabase for storage,
-- and we are not currently syncing Auth0 sessions to Supabase RLS in a way that allows granular control for all operations.

-- List of tables:
-- 1. uzytkownicy
-- 2. turnieje
-- 3. zapisy
-- 4. mecze
-- 5. propozycjeturniejow
-- 6. druzyny
-- 7. teammembers
-- 8. wiadomosci
-- 9. powiadomienia

-- Helper macro (conceptually) - we have to repeat for each table

-- 1. uzytkownicy
ALTER TABLE uzytkownicy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON uzytkownicy;
DROP POLICY IF EXISTS "Enable insert for all users" ON uzytkownicy;
DROP POLICY IF EXISTS "Enable update for all users" ON uzytkownicy;
DROP POLICY IF EXISTS "Enable delete for all users" ON uzytkownicy;
CREATE POLICY "Enable read access for all users" ON uzytkownicy FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert for all users" ON uzytkownicy FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON uzytkownicy FOR UPDATE TO public USING (true);
CREATE POLICY "Enable delete for all users" ON uzytkownicy FOR DELETE TO public USING (true);

-- 2. turnieje
ALTER TABLE turnieje ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON turnieje;
DROP POLICY IF EXISTS "Enable insert for all users" ON turnieje;
DROP POLICY IF EXISTS "Enable update for all users" ON turnieje;
DROP POLICY IF EXISTS "Enable delete for all users" ON turnieje;
CREATE POLICY "Enable read access for all users" ON turnieje FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert for all users" ON turnieje FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON turnieje FOR UPDATE TO public USING (true);
CREATE POLICY "Enable delete for all users" ON turnieje FOR DELETE TO public USING (true);

-- 3. zapisy
ALTER TABLE zapisy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON zapisy;
DROP POLICY IF EXISTS "Enable insert for all users" ON zapisy;
DROP POLICY IF EXISTS "Enable update for all users" ON zapisy;
DROP POLICY IF EXISTS "Enable delete for all users" ON zapisy;
CREATE POLICY "Enable read access for all users" ON zapisy FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert for all users" ON zapisy FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON zapisy FOR UPDATE TO public USING (true);
CREATE POLICY "Enable delete for all users" ON zapisy FOR DELETE TO public USING (true);

-- 4. mecze
ALTER TABLE mecze ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON mecze;
DROP POLICY IF EXISTS "Enable insert for all users" ON mecze;
DROP POLICY IF EXISTS "Enable update for all users" ON mecze;
DROP POLICY IF EXISTS "Enable delete for all users" ON mecze;
CREATE POLICY "Enable read access for all users" ON mecze FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert for all users" ON mecze FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON mecze FOR UPDATE TO public USING (true);
CREATE POLICY "Enable delete for all users" ON mecze FOR DELETE TO public USING (true);

-- 5. propozycjeturniejow
ALTER TABLE propozycjeturniejow ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON propozycjeturniejow;
DROP POLICY IF EXISTS "Enable insert for all users" ON propozycjeturniejow;
DROP POLICY IF EXISTS "Enable update for all users" ON propozycjeturniejow;
DROP POLICY IF EXISTS "Enable delete for all users" ON propozycjeturniejow;
CREATE POLICY "Enable read access for all users" ON propozycjeturniejow FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert for all users" ON propozycjeturniejow FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON propozycjeturniejow FOR UPDATE TO public USING (true);
CREATE POLICY "Enable delete for all users" ON propozycjeturniejow FOR DELETE TO public USING (true);

-- 6. druzyny
ALTER TABLE druzyny ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON druzyny;
DROP POLICY IF EXISTS "Enable insert for all users" ON druzyny;
DROP POLICY IF EXISTS "Enable update for all users" ON druzyny;
DROP POLICY IF EXISTS "Enable delete for all users" ON druzyny;
CREATE POLICY "Enable read access for all users" ON druzyny FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert for all users" ON druzyny FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON druzyny FOR UPDATE TO public USING (true);
CREATE POLICY "Enable delete for all users" ON druzyny FOR DELETE TO public USING (true);

-- 7. teammembers
ALTER TABLE teammembers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON teammembers;
DROP POLICY IF EXISTS "Enable insert for all users" ON teammembers;
DROP POLICY IF EXISTS "Enable update for all users" ON teammembers;
DROP POLICY IF EXISTS "Enable delete for all users" ON teammembers;
CREATE POLICY "Enable read access for all users" ON teammembers FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert for all users" ON teammembers FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON teammembers FOR UPDATE TO public USING (true);
CREATE POLICY "Enable delete for all users" ON teammembers FOR DELETE TO public USING (true);

-- 8. wiadomosci
ALTER TABLE wiadomosci ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON wiadomosci;
DROP POLICY IF EXISTS "Enable insert for all users" ON wiadomosci;
DROP POLICY IF EXISTS "Enable update for all users" ON wiadomosci;
DROP POLICY IF EXISTS "Enable delete for all users" ON wiadomosci;
CREATE POLICY "Enable read access for all users" ON wiadomosci FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert for all users" ON wiadomosci FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON wiadomosci FOR UPDATE TO public USING (true);
CREATE POLICY "Enable delete for all users" ON wiadomosci FOR DELETE TO public USING (true);

-- 9. powiadomienia
ALTER TABLE powiadomienia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON powiadomienia;
DROP POLICY IF EXISTS "Enable insert for all users" ON powiadomienia;
DROP POLICY IF EXISTS "Enable update for all users" ON powiadomienia;
DROP POLICY IF EXISTS "Enable delete for all users" ON powiadomienia;
CREATE POLICY "Enable read access for all users" ON powiadomienia FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert for all users" ON powiadomienia FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON powiadomienia FOR UPDATE TO public USING (true);
CREATE POLICY "Enable delete for all users" ON powiadomienia FOR DELETE TO public USING (true);
