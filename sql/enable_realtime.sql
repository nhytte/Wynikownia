-- Włącz nasłuchiwanie zmian (Realtime) dla tabeli Wiadomosci
-- Jest to wymagane, aby klienci otrzymywali zdarzenia 'INSERT' przez WebSocket.

-- Sprawdź czy tabela jest już w publikacji (to polecenie jest idempotentne w sensie logicznym, ale SQL może rzucić błąd jeśli już jest, więc używamy alter publication)
-- W Supabase domyślna publikacja to 'supabase_realtime'.

ALTER PUBLICATION supabase_realtime ADD TABLE wiadomosci;
