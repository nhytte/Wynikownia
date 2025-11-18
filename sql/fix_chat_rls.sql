-- Naprawa RLS dla tabeli Wiadomosci (Chat)
-- Pozwala na dostęp dla roli public (anonimowej), ponieważ autoryzacja jest w Auth0.

ALTER TABLE Wiadomosci ENABLE ROW LEVEL SECURITY;

-- Usuń stare polityki (dla authenticated)
DROP POLICY IF EXISTS "Zalogowani mogą czytać wiadomości" ON Wiadomosci;
DROP POLICY IF EXISTS "Zalogowani mogą pisać wiadomości" ON Wiadomosci;

-- Dodaj nowe polityki dla public
CREATE POLICY "Enable read access for all users" ON "public"."wiadomosci" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert for all users" ON "public"."wiadomosci" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON "public"."wiadomosci" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON "public"."wiadomosci" AS PERMISSIVE FOR DELETE TO public USING (true);
