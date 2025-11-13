<div align="center">
  <h1>Wynikownia</h1>
  <p><strong>Platforma do zarządzania turniejami, drużynami i wynikami — React 19 + TypeScript + Vite + Auth0 + Supabase.</strong></p>
  <p>
    <a href="https://vitejs.dev">Vite</a> ·
    <a href="https://react.dev">React</a> ·
    <a href="https://supabase.com">Supabase</a> ·
    <a href="https://auth0.com">Auth0</a>
  </p>
</div>

## Spis treści
1. Cel projektu / Overview  
2. Funkcjonalności  
3. Stos technologiczny (Stack)  
4. Logika turniejów (Tournament Engine)  
5. Style i komponenty

---

## 1. Cel projektu / Overview
Wynikownia to aplikacja webowa ułatwiająca:
- zakładanie turniejów sportowych / szachowych / ligowych,
- dodawanie drużyn i ich członków,
- rejestrowanie wyników meczów oraz generowanie tabeli (punkty, bilans bramek),
- obsługę różnych formatów: liga (round-robin), faza grupowa, puchar (knockout), system szwajcarski.

Aplikacja działa jako SPA hostowana na GitHub Pages z dynamicznym `base` dopasowywanym w `vite.config.ts` i w `BrowserRouter`.

## 2. Funkcjonalności
- Rejestracja / logowanie przez Auth0 (openid profile email). 
- Synchronizacja podstawowych danych użytkownika z tabelą `uzytkownicy` w Supabase. 
- Panel administratora (`AdminPanel`) dla zadań moderacyjnych (rola `Administrator`).
- Tworzenie turniejów (`CreateTournament`) i drużyn (`CreateTeam`).
- Podgląd szczegółów turnieju oraz drabinki / terminarza (`TournamentDetail`, komponent `TournamentView`).
- Profil użytkownika (`Profile`).
- Lista drużyn i szczegóły drużyny (`Teams`, `TeamDetail`).

## 3. Stos technologiczny (Stack)
- React 19 + StrictMode
- TypeScript 5.9 (konfiguracje: `tsconfig.app.json`, `tsconfig.node.json`)
- Vite 7 (dev server + build)
- React Router DOM 6
- Auth0 React SDK (`@auth0/auth0-react`)
- Supabase JS v2 (`@supabase/supabase-js`)
- ESLint (konfiguracja w `eslint.config.js`)

## 4. Logika turniejów (Tournament Engine)
Centralny komponent: `components/TournamentView.tsx` obsługuje różne formaty:
- LEAGUE / GROUP_STAGE: tabela + terminarz (fikstury), bulk ustawianie dat kolejki.
- KNOCKOUT: drabinka pucharowa, edycja meczu (drużyny, wyniki).
- SWISS_SYSTEM: ranking + pary rund, wsparcie dla wyników (1-0, 0.5-0.5, 0-1).

Algorytm tabeli (plik `lib/footballTable.ts`):
1. Liczenie statystyk (M, Z, R, P, bramki strzelone / stracone).
2. Punkty: wygrana = 3, remis = 1, przegrana = 0.
3. Sortowanie: Pkt → różnica bramek (GD) → bramki strzelone (GF) → nazwa.

## 5. Style i komponenty
Minimalistyczne style inline + pliki `App.css`, `index.css`. Komponenty stosują proste semantyczne elementy tabel / przycisków. Możliwa przyszła integracja z Tailwind / CSS Modules.

