# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

**Frontend only.** The backend (`/backend/`, Python/FastAPI) and scrapers (`/scrapers/`) belong to another team member — never modify them. `auth.service.ts` is also off-limits unless explicitly requested.

## Commands

All commands run from `frontend/`:

```bash
npm start          # dev server at http://localhost:4200 (proxy /v1 → http://localhost:8000)
npm run build      # production build → dist/cv-analizer/
npm test           # Vitest test runner
```

Running a single test file:
```bash
npx vitest run src/app/path/to/file.spec.ts
```

## Architecture

**Stack:** Angular 21, standalone components, Reactive Forms, RxJS, Keycloak 26 auth. CSR (client-side rendering) — `npm run build` produces a static browser bundle (`dist/cv-analizer/browser/`) served by nginx in production; there is no SSR/Express server.

**Source layout:**
- `src/app/core/services/` — API services and shared business logic
- `src/app/shared/` — reusable standalone components (`FiltersFormComponent`, `LocationPickerComponent`, `TechPickerComponent`, `NavbarComponent`)
- `src/features/` — page-level components (`home`, `offers`, `profile`, `auth`, `about`, `legal`)

**Key services:**
- `job-offers-api.service.ts` — owns `MappedOffer` type, all lookup-key mapping functions (`techNameToKey`, `specNameToKey`, `siteNameToKey`), fallback constants (`FALLBACK_*`), and single-source-of-truth option arrays (`SENIORITY_OPTIONS`, `WORK_MODE_OPTIONS`, `SITE_OPTIONS`)
- `lookups-api.service.ts` — thin HTTP wrappers around `GET /v1/lookups/*`
- `cv-api.service.ts` — CV upload and analysis (`POST /v1/cv/analyze`)
- `user-api.service.ts` — user profile (`GET /v1/users/me/profile`)

**Data loading pattern (home + profile):**
```
ngOnInit():
  1. availableRoles/Techs = FALLBACK_*   ← instant render, no spinner
  2. initForm()
  3. loadSavedFilters()                  ← from localStorage (key: FILTERS_STORAGE_KEY)
  4. loadLookups()                       ← forkJoin → patchFormWithNewLookups()
```

**Navigation between pages:** filters are passed via `router.navigate(..., { state: { filters } })` — `history.state.filters`. The `/offers` route redirects to `/` if this state is absent.

**Environment:** a single `src/environments/environment.ts` is used for both dev and prod (no `environment.prod.ts`, no `fileReplacements`). It sets `apiUrl: '/v1'` (dev proxy rewrites `/v1` → `http://localhost:8000`; in Docker nginx proxies `/v1/` → `backend:8000`) and `keycloakUrl: 'http://localhost:8080'`.

**Auth:** Keycloak realm `it-hell`, `clientId: 'backend-client'`, running on port 8080. Protected endpoints (`/v1/users/me`, CV upload) require a valid token — do not bypass `AuthService`.

## Docker / Keycloak (dev)

Whole stack: `docker compose up -d --build` — frontend on `http://localhost` (nginx, port 80), backend on `:8000`, Keycloak on `:8080`.

- The `it-hell` realm auto-imports from `keyCloak/import/` on **every** startup. There is intentionally **no persistent `keycloak-data` volume** — `start-dev --import-realm` only imports a realm when it does not already exist, so persistence would freeze the realm at its first-imported state. Without it, edits to `keyCloak/import/it-hell-realm.json` (e.g. redirect URIs) take effect after a plain restart. Trade-off: users registered at runtime do not survive a restart; imported users always exist.
- Login test account: **`test@1234.pl`** (email verified). `test_user` is *not* verified and `verifyEmail: true`, so it cannot complete login without working mail.
- `backend-client` allows redirect URIs for `http://localhost/*` (Docker, port 80) and `http://localhost:4200/*` (dev `npm start`).

## Design constraints

All components must use the **light theme**:
- Background: `--bg: #f8fafc` / white cards
- Text: `#1e293b`
- Border: `#cbd5e1`
- Placeholder: `#94a3b8`
- Accent: `#6366f1`

Never introduce dark backgrounds or dark-theme variables.

## Code commenting style

Comments are written in **Polish**, using plain single-line `//` syntax — no JSDoc (`/** */`) anywhere in the codebase.

**File-level header** — every significant `.ts` file starts with a block describing what the component/service does and referencing related files:
```typescript
// Komponent strony głównej (/home) - punkt wejścia aplikacji dla kandydatów.
// Odpowiada za:
//   1. Formularz filtrów - delegowany do FiltersFormComponent
//   2. Upload i analizę CV (POST /v1/cv/analyze przez CvApiService)
//   3. Nawigację do /offers z filtrami w history.state
//
// Powiązane pliki:
//   home.component.html   - szablon
//   filters-form.component.ts  - cały formularz filtrów
```

**Inline comments** — explain the *why* behind non-obvious choices, API contracts, and data transformations:
```typescript
// { emitEvent: false } - nie triggeruje valueChanges, unikamy pętli
this.form.patchValue(saved, { emitEvent: false });

// Fallbacki używane przez mapToOffer gdy pole z API jest null
const FALLBACK_COMPANY = 'Nieznana firma';
```

**Section comments** — for long methods, mark logical sections:
```typescript
// --- Inicjalizacja formularza ---
// --- Zapis do localStorage ---
```

Rules to follow:
- Write comments in Polish
- Explain *why*, not *what* — the code itself explains what
- Cross-reference related files by path when a component has a non-obvious dependency
- No JSDoc, no `@param`, no `@returns`
- Short components with obvious purpose may have no comment at all
