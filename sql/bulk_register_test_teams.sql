-- Replace 123 with your actual tournament ID
INSERT INTO Zapisy (turniej_id, user_id, nazwa_druzyny, status)
SELECT 
    123, 
    owner_id, 
    nazwa_druzyny, 
    'Zaakceptowany'
FROM Druzyny
WHERE nazwa_druzyny LIKE 'druzyna_test%'
-- Avoid duplicates
AND nazwa_druzyny NOT IN (SELECT nazwa_druzyny FROM Zapisy WHERE turniej_id = 123);
