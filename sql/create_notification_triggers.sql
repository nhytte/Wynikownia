-- Funkcja do obsługi powiadomień o dołączeniu do drużyny
CREATE OR REPLACE FUNCTION notify_team_join_request() RETURNS TRIGGER AS $$
DECLARE
    v_owner_id VARCHAR(255);
    v_team_name VARCHAR(255);
    v_user_name VARCHAR(255);
BEGIN
    -- Pobierz ID właściciela drużyny i nazwę drużyny
    SELECT owner_id, nazwa_druzyny INTO v_owner_id, v_team_name
    FROM Druzyny
    WHERE druzyna_id = NEW.druzyna_id;

    -- Pobierz nazwę użytkownika, który chce dołączyć
    SELECT nazwa_wyswietlana INTO v_user_name
    FROM Uzytkownicy
    WHERE user_id = NEW.user_id;

    -- Jeśli status to 'pending', wyślij powiadomienie do właściciela
    IF NEW.status = 'pending' AND v_owner_id IS NOT NULL THEN
        INSERT INTO Powiadomienia (user_id, tresc, typ, link)
        VALUES (
            v_owner_id, 
            'Użytkownik ' || COALESCE(v_user_name, 'Nieznany') || ' chce dołączyć do drużyny ' || v_team_name,
            'zaproszenie_druzyna',
            '/teams/' || NEW.druzyna_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger dla TeamMembers
DROP TRIGGER IF EXISTS trigger_notify_team_join ON TeamMembers;
CREATE TRIGGER trigger_notify_team_join
AFTER INSERT ON TeamMembers
FOR EACH ROW
EXECUTE FUNCTION notify_team_join_request();


-- Funkcja do obsługi powiadomień o zapisie na turniej
CREATE OR REPLACE FUNCTION notify_tournament_join_request() RETURNS TRIGGER AS $$
DECLARE
    v_organizer_id VARCHAR(255);
    v_tournament_name VARCHAR(255);
    v_user_name VARCHAR(255);
BEGIN
    -- Pobierz ID organizatora i nazwę turnieju
    SELECT organizator_id, nazwa INTO v_organizer_id, v_tournament_name
    FROM Turnieje
    WHERE turniej_id = NEW.turniej_id;

    -- Pobierz nazwę użytkownika
    SELECT nazwa_wyswietlana INTO v_user_name
    FROM Uzytkownicy
    WHERE user_id = NEW.user_id;

    -- Jeśli status to 'Oczekujacy', wyślij powiadomienie do organizatora
    IF NEW.status = 'Oczekujacy' AND v_organizer_id IS NOT NULL THEN
        INSERT INTO Powiadomienia (user_id, tresc, typ, link)
        VALUES (
            v_organizer_id, 
            'Nowe zgłoszenie do turnieju ' || v_tournament_name || ' od ' || COALESCE(v_user_name, 'Nieznany'),
            'zaproszenie_turniej',
            '/tournaments/' || NEW.turniej_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger dla Zapisy
DROP TRIGGER IF EXISTS trigger_notify_tournament_join ON Zapisy;
CREATE TRIGGER trigger_notify_tournament_join
AFTER INSERT ON Zapisy
FOR EACH ROW
EXECUTE FUNCTION notify_tournament_join_request();

-- Sekcja pg_cron - Harmonogram powiadomień
-- Wymaga włączonego rozszerzenia pg_cron w bazie danych

-- Usuwamy stare harmonogramy o tych nazwach, aby uniknąć duplikatów
-- Używamy bezpieczniejszej metody usuwania po ID znalezionym w tabeli cron.job
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'powiadomienie_1_dzien_przed';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'powiadomienie_start_turnieju';

-- 1. Powiadomienie 1 dzień przed turniejem (dla Organizatora i Uczestników)
SELECT cron.schedule(
    'powiadomienie_1_dzien_przed',
    '0 8 * * *', -- Codziennie o 8:00
    $$
    -- Powiadomienie dla Organizatorów
    INSERT INTO Powiadomienia (user_id, tresc, typ, link)
    SELECT 
        t.organizator_id, 
        'Jutro rozpoczyna się Twój turniej: ' || t.nazwa, 
        'info', 
        '/tournaments/' || t.turniej_id
    FROM Turnieje t
    WHERE t.data_rozpoczecia::date = (CURRENT_DATE + INTERVAL '1 day');

    -- Powiadomienie dla Uczestników (Zaakceptowanych)
    INSERT INTO Powiadomienia (user_id, tresc, typ, link)
    SELECT 
        z.user_id,
        'Jutro startuje turniej: ' || t.nazwa,
        'info', 
        '/tournaments/' || t.turniej_id
    FROM Turnieje t
    JOIN Zapisy z ON t.turniej_id = z.turniej_id
    WHERE t.data_rozpoczecia::date = (CURRENT_DATE + INTERVAL '1 day')
    AND z.status = 'Zaakceptowany';
    $$
);

-- 2. Powiadomienie w dniu rozpoczęcia turnieju
SELECT cron.schedule(
    'powiadomienie_start_turnieju',
    '0 7 * * *', -- Codziennie o 7:00
    $$
    -- Dla Organizatorów
    INSERT INTO Powiadomienia (user_id, tresc, typ, link)
    SELECT 
        t.organizator_id, 
        'Dzisiaj rozpoczyna się Twój turniej: ' || t.nazwa, 
        'turniej_start', 
        '/tournaments/' || t.turniej_id
    FROM Turnieje t
    WHERE t.data_rozpoczecia::date = CURRENT_DATE;

    -- Dla Uczestników
    INSERT INTO Powiadomienia (user_id, tresc, typ, link)
    SELECT 
        z.user_id,
        'Dzisiaj startuje turniej: ' || t.nazwa,
        'turniej_start', 
        '/tournaments/' || t.turniej_id
    FROM Turnieje t
    JOIN Zapisy z ON t.turniej_id = z.turniej_id
    WHERE t.data_rozpoczecia::date = CURRENT_DATE
    AND z.status = 'Zaakceptowany';
    $$
);
