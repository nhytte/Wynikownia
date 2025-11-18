-- Naprawa błędów RLS (Row Level Security) dla tabel druzyny i teammembers
-- Ten skrypt włącza RLS i dodaje polityki pozwalające na operacje CRUD dla wszystkich użytkowników (public).
-- Jest to wymagane, ponieważ aplikacja używa klucza anonimowego Supabase, a autoryzacja jest obsługiwana po stronie klienta (Auth0).

-- 1. Tabela druzyny
ALTER TABLE druzyny ENABLE ROW LEVEL SECURITY;

-- Usuń stare polityki, jeśli istnieją, aby uniknąć konfliktów
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."druzyny";
DROP POLICY IF EXISTS "Enable insert for all users" ON "public"."druzyny";
DROP POLICY IF EXISTS "Enable update for all users" ON "public"."druzyny";
DROP POLICY IF EXISTS "Enable delete for all users" ON "public"."druzyny";

-- Dodaj nowe polityki
CREATE POLICY "Enable read access for all users" ON "public"."druzyny" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert for all users" ON "public"."druzyny" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON "public"."druzyny" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON "public"."druzyny" AS PERMISSIVE FOR DELETE TO public USING (true);


-- 2. Tabela teammembers
ALTER TABLE teammembers ENABLE ROW LEVEL SECURITY;

-- Usuń stare polityki
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."teammembers";
DROP POLICY IF EXISTS "Enable insert for all users" ON "public"."teammembers";
DROP POLICY IF EXISTS "Enable update for all users" ON "public"."teammembers";
DROP POLICY IF EXISTS "Enable delete for all users" ON "public"."teammembers";

-- Dodaj nowe polityki
CREATE POLICY "Enable read access for all users" ON "public"."teammembers" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert for all users" ON "public"."teammembers" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON "public"."teammembers" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON "public"."teammembers" AS PERMISSIVE FOR DELETE TO public USING (true);


-- 3. Tabela uzytkownicy
ALTER TABLE uzytkownicy ENABLE ROW LEVEL SECURITY;

-- Usuń stare polityki
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."uzytkownicy";
DROP POLICY IF EXISTS "Enable insert for all users" ON "public"."uzytkownicy";
DROP POLICY IF EXISTS "Enable update for all users" ON "public"."uzytkownicy";
DROP POLICY IF EXISTS "Enable delete for all users" ON "public"."uzytkownicy";

-- Dodaj nowe polityki
CREATE POLICY "Enable read access for all users" ON "public"."uzytkownicy" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert for all users" ON "public"."uzytkownicy" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON "public"."uzytkownicy" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON "public"."uzytkownicy" AS PERMISSIVE FOR DELETE TO public USING (true);
