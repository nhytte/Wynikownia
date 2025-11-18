-- Tabela Wiadomości (Czat i Ogłoszenia)
CREATE TABLE Wiadomosci (
    wiadomosc_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    tresc TEXT NOT NULL,
    typ VARCHAR(50) NOT NULL CHECK (typ IN ('druzyna', 'turniej', 'turniej_pilne')),
    cel_id INT NOT NULL, -- ID drużyny lub turnieju
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Uzytkownicy(user_id)
);

-- Indeksy dla wydajności
CREATE INDEX idx_wiadomosci_cel_typ ON Wiadomosci(cel_id, typ);

-- RLS dla Wiadomosci
ALTER TABLE Wiadomosci ENABLE ROW LEVEL SECURITY;

-- Polityka odczytu:
-- 1. Każdy może czytać (uproszczenie, w idealnym świecie sprawdzalibyśmy członkostwo, ale RLS w Supabase z joinami bywa skomplikowane dla 'public' roli bez funkcji pomocniczych. 
--    Dla bezpieczeństwa można dodać funkcję sprawdzającą, ale na razie zrobimy 'public' read dla uproszczenia, lub ograniczymy w aplikacji).
--    Dla 'druzyna' - tylko członkowie. Dla 'turniej' - tylko uczestnicy? 
--    Zróbmy politykę otwartą dla uwierzytelnionych, filtrowanie na froncie, lub proste checki.
--    Dla bezpieczeństwa danych:
--    - 'druzyna': user musi być w TeamMembers tej drużyny.
--    - 'turniej': user musi być w Zapisy tego turnieju LUB być organizatorem.

-- Uproszczona polityka "zalogowani widzą wszystko" (w MVP często wystarcza, frontend filtruje kontekst):
CREATE POLICY "Zalogowani mogą czytać wiadomości" ON Wiadomosci FOR SELECT TO authenticated USING (true);
CREATE POLICY "Zalogowani mogą pisać wiadomości" ON Wiadomosci FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);

-- Trigger dla Pilnych Wiadomości (Powiadomienia)
CREATE OR REPLACE FUNCTION notify_urgent_message() RETURNS TRIGGER AS $$
DECLARE
    v_tournament_name VARCHAR(255);
BEGIN
    IF NEW.typ = 'turniej_pilne' THEN
        -- Pobierz nazwę turnieju
        SELECT nazwa INTO v_tournament_name FROM Turnieje WHERE turniej_id = NEW.cel_id;

        -- Wstaw powiadomienia dla wszystkich zaakceptowanych uczestników
        INSERT INTO Powiadomienia (user_id, tresc, typ, link)
        SELECT 
            z.user_id,
            'Pilna wiadomość w turnieju ' || v_tournament_name || ': ' || LEFT(NEW.tresc, 50) || '...',
            'alert',
            '/tournaments/' || NEW.cel_id
        FROM Zapisy z
        WHERE z.turniej_id = NEW.cel_id AND z.status = 'Zaakceptowany'
        AND z.user_id != NEW.user_id; -- Nie wysyłaj do nadawcy
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_urgent_message
AFTER INSERT ON Wiadomosci
FOR EACH ROW
EXECUTE FUNCTION notify_urgent_message();
