-- Rozszerzenie systemu pilnych wiadomości o drużyny

-- 1. Aktualizacja constrainta, aby pozwolić na 'druzyna_pilne'
ALTER TABLE Wiadomosci DROP CONSTRAINT IF EXISTS wiadomosci_typ_check;
ALTER TABLE Wiadomosci ADD CONSTRAINT wiadomosci_typ_check CHECK (typ IN ('druzyna', 'turniej', 'turniej_pilne', 'druzyna_pilne'));

-- 2. Aktualizacja funkcji triggera
CREATE OR REPLACE FUNCTION notify_urgent_message() RETURNS TRIGGER AS $$
DECLARE
    v_name VARCHAR(255);
BEGIN
    IF NEW.typ = 'turniej_pilne' THEN
        -- Pobierz nazwę turnieju
        SELECT nazwa INTO v_name FROM Turnieje WHERE turniej_id = NEW.cel_id;

        -- Wstaw powiadomienia dla wszystkich zaakceptowanych uczestników
        INSERT INTO Powiadomienia (user_id, tresc, typ, link)
        SELECT 
            z.user_id,
            'Pilna wiadomość w turnieju ' || v_name || ': ' || LEFT(NEW.tresc, 50) || '...',
            'alert',
            '/tournaments/' || NEW.cel_id
        FROM Zapisy z
        WHERE z.turniej_id = NEW.cel_id AND z.status = 'Zaakceptowany'
        AND z.user_id != NEW.user_id; -- Nie wysyłaj do nadawcy

    ELSIF NEW.typ = 'druzyna_pilne' THEN
        -- Pobierz nazwę drużyny
        SELECT nazwa_druzyny INTO v_name FROM Druzyny WHERE druzyna_id = NEW.cel_id;

        -- Wstaw powiadomienia dla wszystkich członków (accepted)
        INSERT INTO Powiadomienia (user_id, tresc, typ, link)
        SELECT 
            tm.user_id,
            'Pilna wiadomość w drużynie ' || v_name || ': ' || LEFT(NEW.tresc, 50) || '...',
            'alert',
            '/teams/' || NEW.cel_id
        FROM TeamMembers tm
        WHERE tm.druzyna_id = NEW.cel_id AND tm.status = 'accepted'
        AND tm.user_id != NEW.user_id; -- Nie wysyłaj do nadawcy
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
