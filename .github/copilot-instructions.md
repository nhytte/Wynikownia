## Copilot instructions — Wynikownia

This file gives concise, repository-specific guidance so an AI coding agent can be immediately productive.

Overview
- This is a minimal Vite + React + TypeScript single-page app. Entry: `index.html` -> `/src/main.tsx` -> `src/App.tsx`.
- Vite is configured in `vite.config.ts` and uses `@vitejs/plugin-react` for Fast Refresh/HMR.

Key workflows
- Run the dev server (HMR): `npm run dev` (runs `vite`). Edit `src/App.tsx` to confirm HMR.
- Build for production: `npm run build` which executes `tsc -b && vite build`. Note: the TypeScript build (`tsc -b`) is required and must succeed before `vite build`.
- Linting: `npm run lint` (uses `eslint`). See `eslint.config.js` for rules.

Project layout & conventions
- Source: `src/` (components, styles, assets). Example files: `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/App.css`.
- Assets: imports under `src/assets` use relative imports (e.g. `import reactLogo from './assets/react.svg'`). Public/static files use absolute paths from project root (e.g. `/vite.svg`).
- Explicit extensions are used in imports in this repo (e.g. `import App from './App.tsx'` in `src/main.tsx`). Preserve this pattern when moving/renaming files to avoid resolution confusion with the Vite + TypeScript setup.
- React 19 APIs are used (`createRoot` from `react-dom/client` + `StrictMode`). Prefer function components and .tsx files.

TypeScript & linting notes
- Type-checking is done by `tsc -b` before build. There are additional tsconfig files: `tsconfig.app.json` and `tsconfig.node.json` (used by tooling and ESLint if enabled).
- If you add new project references or split the codebase, update `tsconfig.*.json` and ensure `tsc -b` still succeeds.
- ESLint is configured via `eslint.config.js`. If enabling type-aware lint rules, add `parserOptions.project` entries for `tsconfig.app.json` and `tsconfig.node.json` (see the repository README for the template example).

Common change patterns & quick examples
- To add a new page/component: create `src/components/MyWidget.tsx` and `src/components/MyWidget.css`, import in `src/App.tsx` and verify HMR in dev.
- To add a public asset: place files in the project root or `public/` and reference them with an absolute path `/my-file.ext`.

Integration points & external deps
- Only runtime deps: `react`, `react-dom`. Dev tooling: `vite`, `typescript`, `eslint`, `@vitejs/plugin-react`.
- No backend or API integration is present in the repo root; if you add one, document environment variables and proxy rules in `vite.config.ts`.

What an agent should do first
1. Run `npm install` then `npm run dev` to confirm the local dev loop works.
2. Open `src/main.tsx` and `src/App.tsx` to see the signal path for UI updates and HMR behavior.
3. When making build changes, run `npm run build` to catch TypeScript errors early (because `tsc -b` runs first).

Files to inspect when in doubt
- `package.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`.

This is our current database schema for the tournament management system, every table starts with lower case letter(very important):
-- 1. Tabela Użytkowników (z Auth0)
CREATE TABLE Uzytkownicy (
    user_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nazwa_wyswietlana VARCHAR(100),
    rola VARCHAR(20) NOT NULL DEFAULT 'Uzytkownik' CHECK (rola IN ('Uzytkownik', 'Administrator')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela Turniejów
CREATE TABLE Turnieje (
    turniej_id SERIAL PRIMARY KEY,
    nazwa VARCHAR(255) NOT NULL,
    dyscyplina VARCHAR(20) NOT NULL CHECK (dyscyplina IN ('Pilka nozna', 'Szachy')), 
    typ_zapisu VARCHAR(20) NOT NULL CHECK (typ_zapisu IN ('Indywidualny', 'Drużynowy')),
    lokalizacja VARCHAR(255),
    data_rozpoczecia TIMESTAMP NOT NULL, 
    organizator_id VARCHAR(255),
    FOREIGN KEY (organizator_id) REFERENCES Uzytkownicy(user_id)
);

-- 3. Tabela Zapisów (łącząca Użytkowników i Turnieje)
CREATE TABLE Zapisy (
    zapis_id SERIAL PRIMARY KEY,
    turniej_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    data_zapisu TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Oczekujacy' CHECK (status IN ('Oczekujacy', 'Zaakceptowany', 'Odrzucony')),
    FOREIGN KEY (turniej_id) REFERENCES Turnieje(turniej_id),
    FOREIGN KEY (user_id) REFERENCES Uzytkownicy(user_id),
    UNIQUE(turniej_id, user_id) 
);
CREATE TABLE Mecze (
    mecz_id SERIAL PRIMARY KEY,
    turniej_id INT NOT NULL,
    uczestnik_1_zapis_id INT, 
    uczestnik_2_zapis_id INT,

    -- Wyniki dla Piłki Nożnej
    wynik_1_int INT,
    wynik_2_int INT,

    -- Wyniki dla Szachów
    wynik_1_decimal DECIMAL(2,1),
    wynik_2_decimal DECIMAL(2,1),

    status VARCHAR(20) DEFAULT 'Zaplanowany' CHECK (status IN ('Zaplanowany', 'Zakonczony')),
    data_meczu TIMESTAMP, 
    wprowadzony_przez_id VARCHAR(255), 

    FOREIGN KEY (turniej_id) REFERENCES Turnieje(turniej_id),
    FOREIGN KEY (wprowadzony_przez_id) REFERENCES Uzytkownicy(user_id),
    FOREIGN KEY (uczestnik_1_zapis_id) REFERENCES Zapisy(zapis_id),
    FOREIGN KEY (uczestnik_2_zapis_id) REFERENCES Zapisy(zapis_id)
);

-- 5. Tabela Propozycji Turniejów (od Użytkowników dla Admina)
CREATE TABLE PropozycjeTurniejow (
    propozycja_id SERIAL PRIMARY KEY,
    sugerowany_przez_user_id VARCHAR(255) NOT NULL,
    sugerowana_nazwa VARCHAR(255) NOT NULL,
    sugerowana_dyscyplina VARCHAR(20) NOT NULL CHECK (sugerowana_dyscyplina IN ('Pilka nozna', 'Szachy')),
    sugerowana_lokalizacja VARCHAR(255),
    sugerowana_data_rozpoczecia TIMESTAMP,
    dodatkowy_opis TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Nowa' CHECK (status IN ('Nowa', 'Rozpatrywana', 'Odrzucona', 'Zatwierdzona')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sugerowany_przez_user_id) REFERENCES Uzytkownicy(user_id)
);

-- 6. Modyfikacje (ALTER TABLE) dodające nowe funkcje
ALTER TABLE Turnieje
ADD COLUMN max_uczestnikow INT;

ALTER TABLE Turnieje
ADD COLUMN format_rozgrywek VARCHAR(20) CHECK (format_rozgrywek IN ('Pucharowy', 'Liga', 'Towarzyski'));

ALTER TABLE Zapisy
ADD COLUMN nazwa_druzyny VARCHAR(100);

For more table changes look into sql/*.sql files. If 

If anything here looks incomplete or you need more repo-specific rules (commit message format, branching, CI), ask for the missing details and I will augment this file.

