# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

**Frontend modifications only.** Backend (`/backend/`, Python/FastAPI) and scrapers (`/scrapers/`) belong to another team member — never modify them. `auth.service.ts` is off-limits unless explicitly requested.

## Commands

### Frontend (from `frontend/`)

```bash
npm start          # dev server at http://localhost:4200 (proxy /v1 → http://localhost:8000)
npm run build      # production build → dist/cv-analizer/browser/
npm test           # Vitest (all specs, watch mode)
npm test -- --reporter=verbose   # pełny output bez watch mode
```

### Backend (from `backend/`)

```bash
uv sync                        # install dependencies
uv run uvicorn src.api.main:app --reload   # dev server at http://localhost:8000
uv run alembic upgrade head    # apply migrations
uv run pytest                  # all tests (uses SQLite in-memory, no real DB needed)
uv run pytest tests/services/test_job_offers_service.py   # single test file
uv run python -m worker.main   # start the Redis consumer worker
```

### Scrapers (from `scrapers/`)

```bash
uv sync
uv run main.py                 # run all scrapers
uv run main.py -s pracuj_pl    # run specific scraper (pracuj_pl | theprotocol_it)
uv run pytest                  # tests (no external services needed)
```

### Full stack (repo root)

```bash
docker compose up -d --build   # frontend :80, backend :8000, Keycloak :8080
docker compose up -d --build keycloak   # start only Keycloak
```

## System Architecture

The stack is: **Angular 21 frontend → FastAPI backend ← Worker ← Redis ← Scrapers**, all orchestrated by Docker Compose. Keycloak handles auth for both frontend (OIDC) and backend (JWT verification).

```
Browser → nginx(:80) → Angular SPA
                     → /v1/* → FastAPI(:8000) → PostgreSQL
                                               ↑
                                           Worker ← Redis Stream ← Scrapers
Keycloak(:8080) ← Angular (login) / FastAPI (JWT verify)
```

## Frontend Architecture

**Stack:** Angular 21, standalone components, Reactive Forms, RxJS. CSR — no SSR/Express.

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

**Environment:** a single `src/environments/environment.ts` is used for both dev and prod (no `environment.prod.ts`, no `fileReplacements`). Sets `apiUrl: '/v1'` and `keycloakUrl: 'http://localhost:8080'`.

**Auth (`auth.service.ts`):** Keycloak realm `it-hell`, `clientId: 'backend-client'`. The Keycloak client instance is constructed via `protected createKeycloak()` — this is intentional to allow subclassing in tests (the test class overrides `createKeycloak()` to return a mock instead of a real keycloak-js instance). Do not inline the constructor back into `init()`.

## Backend Architecture

FastAPI with a 5-layer architecture (all commands run from `backend/`):

```
Router (src/api/v1/routers/) → Service (src/services/) → Repository (src/repositories/) → Model (src/models/) → DB
```

- **Routers** — HTTP entry points only; dependency injection handles JWT auth via `get_current_user` / `get_optional_current_user`. No business logic here.
- **Services** — all business logic. Key services: `JobOffersService` (filtering, uniqueness checks), `AuthService` (JWT decode + Keycloak public key fetch), `TechExtractorService` (CV parsing + fuzzy tech matching), `UserProfileService` (Keycloak UUID → DB profile UPSERT), `LookupsService` (resolve/create lookup entities on-the-fly).
- **Repositories** — only layer with SQLAlchemy queries. Returns models to services.
- **Worker** (`worker/`) — separate async process consuming from a Redis Stream. Runs `pipeline.py` → `normalize_offer()` → calls `JobOffersService` to save. Entry point: `uv run python -m worker.main`.

**Tests** use SQLite in-memory (`aiosqlite`) — no real PostgreSQL needed. `backend/tests/conftest.py` provides `db_session` fixture. Worker tests live in `backend/tests_worker/`.

**Access control:** Unauthenticated users get filtered results limited to one source site (`UnregisteredUserSettings.SITE_NAME = "Pracuj.pl"`). Authenticated users see all sites.

## Scrapers Architecture

Two scrapers (`pracuj_pl`, `theprotocol_it`) run concurrently via `asyncio`. Each uses `curl_cffi` (TLS fingerprinting) to bypass anti-bot defenses, parses HTML with BeautifulSoup, validates against Pydantic `JobOffer` schema, then pushes to a Redis Stream via `XADD`. The Worker consumes from this stream.

Configuration: `scrapers/app-config.yaml` (mounted into Docker container as `/app/app-config.yaml:ro`).

## Docker / Keycloak (dev)

- Realm file location: **`frontend/it-hell-realm.json`** — this is the tracked source of truth. `compose.yaml` mounts it directly to `/opt/keycloak/data/import/it-hell-realm.json:ro` (the `keyCloak/import/` directory is empty on this branch). Edit `frontend/it-hell-realm.json` to change realm config; restart Keycloak to apply.
- No persistent `keycloak-data` volume — `start-dev --import-realm` re-imports on every startup, so realm edits take effect after a plain restart. Trade-off: runtime-registered users don't survive restart; imported users always exist.
- Login test account: **`test@1234.pl`** (email verified). `test_user` is not verified (`verifyEmail: true`) and cannot log in without working mail.
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
```

**Section comments** — for long methods, mark logical sections:
```typescript
// --- Inicjalizacja formularza ---
// --- Zapis do localStorage ---
```

Rules: Polish only, explain *why* not *what*, cross-reference related files by path, no JSDoc/`@param`/`@returns`.
