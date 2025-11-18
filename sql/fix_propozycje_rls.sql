-- Fix RLS for PropozycjeTurniejow
-- Allows public access (since we are using Auth0 and not syncing session to Supabase yet)

ALTER TABLE propozycjeturniejow ENABLE ROW LEVEL SECURITY;

-- Remove existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON propozycjeturniejow;
DROP POLICY IF EXISTS "Enable insert for all users" ON propozycjeturniejow;
DROP POLICY IF EXISTS "Enable update for all users" ON propozycjeturniejow;
DROP POLICY IF EXISTS "Enable delete for all users" ON propozycjeturniejow;

-- Create permissive policies
CREATE POLICY "Enable read access for all users" ON propozycjeturniejow FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert for all users" ON propozycjeturniejow FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON propozycjeturniejow FOR UPDATE TO public USING (true);
CREATE POLICY "Enable delete for all users" ON propozycjeturniejow FOR DELETE TO public USING (true);
