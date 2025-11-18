-- Tabela Powiadomień
CREATE TABLE Powiadomienia (
    powiadomienie_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    tresc TEXT NOT NULL,
    typ VARCHAR(50) NOT NULL CHECK (typ IN ('info', 'turniej_start', 'turniej_koniec', 'zaproszenie_druzyna', 'zaproszenie_turniej', 'alert')),
    link VARCHAR(255),
    przeczytane BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Uzytkownicy(user_id)
);
