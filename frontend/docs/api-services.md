# 🌐 API & Services — IT-Hell Frontend

The communication layer with the FastAPI backend. This document describes all services, DTOs and the proxy config. It complements the [main README](../README.md).

## 📑 Table of contents

- [Overview](#overview)
- [Configuration (proxy & environment)](#configuration-proxy--environment)
- [UserApiService](#userapiservice)
- [CvApiService](#cvapiservice)
- [JobOffersApiService](#joboffersapiservice)
- [LookupsApiService](#lookupsapiservice)
- [AuthService](#authservice)
- [DTOs (models)](#dtos-models)

---

## Overview

All services live in `src/app/core/services/` (except `AuthService` in `src/features/auth/`). Each service is a **standalone singleton** (`providedIn: 'root'`).

| Service | File | Backend endpoints |
|---|---|---|
| `AuthService` | `src/features/auth/auth.service.ts` | (Keycloak, not the API) |
| `UserApiService` | `src/app/core/services/user-api.service.ts` | `GET /v1/users/me`, `GET/PUT /v1/users/me/profile` |
| `CvApiService` | `src/app/core/services/cv-api.service.ts` | `POST /v1/cv/upload` (multipart) |
| `JobOffersApiService` | `src/app/core/services/job-offers-api.service.ts` | `GET /v1/job-offers/get_offer_filter` |
| `LookupsApiService` | `src/app/core/services/lookups-api.service.ts` | `GET /v1/lookups/*` |

**Conventions:**

- `JobOffersApiService`, `LookupsApiService` and `CvApiService` return `Observable<T>` (RxJS) — the component decides whether to `subscribe()` with `takeUntil()`.
- `UserApiService` returns `Promise<T>` (it converts the `Observable` with `firstValueFrom()`), so components can `await` it.
- No global error interceptor — errors are handled in the components (different strategies for 401/404/500).
- DTOs are typed as TypeScript interfaces, defined in `core/models/` or in the service file itself.

---

## Configuration (proxy & environment)

The API layer reads its base URL from `environment.apiUrl` (`/v1`) and, in dev, relies on
`proxy.conf.json` to forward `/v1/*` to the backend. Both are documented in one place —
see [`docs/env-vars.md`](env-vars.md):

- **`environment.ts`** — `apiUrl`, `keycloakUrl`, `keycloakRealm`, `keycloakClientId` (and the
  production `fileReplacements` note).
- **`proxy.conf.json`** — the dev-only `/v1 → http://localhost:8000` proxy.

---

## UserApiService

**File:** `src/app/core/services/user-api.service.ts`

Operations on the logged-in user's profile. All methods return a `Promise` (via `firstValueFrom`).

### DTOs

```typescript
interface UserMeDto {
  id_keycloak: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface UserProfileDto {
  id: string;
  user_id: string;
  raw_cv: string | null;        // null means the user has no CV uploaded
  exp_level: { id: string; name: string } | null;
  technologies: Array<{ id: string; name: string }>;
}

interface UserProfileUpdateDto {
  exp_level_id?: string | null;
  technology_ids?: string[] | null;
}
```

### Methods

| Method | HTTP | Endpoint | Returns |
|---|---|---|---|
| `getMe()` | `GET` | `/v1/users/me` | `Promise<UserMeDto>` |
| `getMyProfile()` | `GET` | `/v1/users/me/profile` | `Promise<UserProfileDto>` |
| `updateMyProfile(payload)` | `PUT` | `/v1/users/me/profile` | `Promise<UserProfileDto>` |

**Notes:**
- `getMyProfile()` returns **404 for new users** — the component must handle it (`profile.component.ts` treats a 404 as "empty profile").
- `updateMyProfile()` uses **upsert semantics** in the backend — no separate `createProfile()` is needed.
- The JWT is attached **automatically** by `authInterceptor` (`app.config.ts`).

---

## CvApiService

**File:** `src/app/core/services/cv-api.service.ts`

CV analysis — extracts technologies.

### Methods

| Method | HTTP | Endpoint | Returns |
|---|---|---|---|
| `uploadCv(file: File)` | `POST` | `/v1/cv/upload` | `Observable<LookupDto[]>` |

**Request body:** `multipart/form-data` with a `file` field (PDF/DOC/DOCX; the frontend validates a 10 MB max)

**Response:** a list of detected technologies (`LookupDto[]`)

```typescript
[
  { id: 'tech-react', name: 'React' },
  { id: 'tech-typescript', name: 'TypeScript' },
  // ...
]
```

> 📖 For the CV analysis algorithm details, see the backend documentation.

---

## JobOffersApiService

**File:** `src/app/core/services/job-offers-api.service.ts`

The job offer list with filters and pagination.

### DTOs

```typescript
// Raw backend response
interface JobOfferApiResponse {
  id: string;
  url: string;
  title: string;
  description: string;
  salary_from: number | null;
  salary_to: number | null;
  site: LookupDto | null;
  company: LookupDto | null;
  work_type: LookupDto | null;
  exp_level: LookupDto | null;
  specialization: LookupDto | null;
  technologies: LookupDto[];
  locations: LookupDto[];
  publication_date: string | null;   // ISO 8601, null when the scraper gave no date
  expiration_date: string | null;    // ISO 8601, null when the scraper gave no date
}

// Mapped model used in the UI
interface MappedOffer {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: string;
  workTypeId: string;          // work mode ID (for getWorkModeLabel)
  salaryMin: number;
  salaryMax: number;
  technologies: string[];      // IDs
  technologyNames: string[];   // display names
  roles: string[];
  seniority: string;
  source: string;              // job board ID (for formatSource)
  postedLabel: string;
  description: string;
  url?: string;
  publicationDate: string | null;   // copied from publication_date
  expirationDate: string | null;    // copied from expiration_date
}
```

### Methods

| Method | HTTP | Endpoint | Returns |
|---|---|---|---|
| `getOffers(params?)` | `GET` | `/v1/job-offers/get_offer_filter` | `Observable<JobOfferApiResponse[]>` |
| `mapToOffer(api: JobOfferApiResponse)` | — | (pure function) | `MappedOffer` |

### Query parameters

| Parameter | Type | Description |
|---|---|---|
| `skip` | number | pagination offset |
| `limit` | number | page size (default 20) |
| `salary_from_min` | number | lower salary bound |
| `salary_to_max` | number | upper salary bound |
| `technology_ids[]` | string[] | technology filter |
| `specialization_ids[]` | string[] | IT area (backend/frontend/...) |
| `work_type_ids[]` | string[] | work mode (remote/hybrid/onsite) |
| `exp_level_ids[]` | string[] | seniority |
| `site_ids[]` | string[] | job boards (e.g. pracuj, theprotocol) |
| `location_ids[]` | string[] | cities |
| `title` | string | title search (LIKE) |

### DTO → UI mapping

`mapToOffer()` handles:
- `null` values from the database (e.g. no company)
- The string `'None'` that Python/FastAPI sometimes returns for empty fields
- Fallbacks: `'Nieznana firma'`, `'Zdalnie'`, `'Nie podano'`

---

## LookupsApiService

**File:** `src/app/core/services/lookups-api.service.ts`

Lookups used in the forms (technologies, locations, specializations, ...).

### Methods

All methods return `Observable<LookupDto[]>`:

| Method | Endpoint | What it returns |
|---|---|---|
| `getTechnologies()` | `GET /v1/lookups/technologies` | technology list (React, Vue, Python, ...) |
| `getSpecializations()` | `GET /v1/lookups/specializations` | IT areas (Frontend Dev, DevOps, ...) |
| `getWorkTypes()` | `GET /v1/lookups/work-types` | work modes (remote/hybrid/onsite) |
| `getExperienceLevels()` | `GET /v1/lookups/experience-levels` | seniority (Junior/Mid/Senior/Lead) |
| `getSites()` | `GET /v1/lookups/sites` | job boards scraped into the DB (Pracuj.pl, TheProtocol.it) |
| `getLocations()` | `GET /v1/lookups/locations` | cities from the database |

### Usage pattern

`FiltersFormComponent` fetches **all lookups in parallel** via `forkJoin()`:

```typescript
forkJoin({
  techs:     this.lookupsApi.getTechnologies(),
  specs:     this.lookupsApi.getSpecializations(),
  workTypes: this.lookupsApi.getWorkTypes(),
  expLevels: this.lookupsApi.getExperienceLevels(),
  sites:     this.lookupsApi.getSites(),
  locations: this.lookupsApi.getLocations()
}).pipe(takeUntil(this.destroy$)).subscribe(...);
```

**Cache:** none in the service itself (each call = a new request). The de-facto cache comes from `FiltersFormComponent` loading the lookups **once** in `ngOnInit()` and keeping them in properties.

---

## AuthService

**File:** `src/features/auth/auth.service.ts`

The central authorization service. **Does not call the backend** — it only talks to Keycloak via `keycloak-js`.

### State (Signals)

```typescript
isAuthenticated: Signal<boolean>     // true when there's an active JWT
username: Signal<string | null>      // given_name from the token (or preferred_username), or null
```

### Public methods

| Method | What it does |
|---|---|
| `init()` | Initializes the Keycloak client (PKCE S256, check-sso). Called from `APP_INITIALIZER`. |
| `login(redirectPath?)` | Redirects to the Keycloak form. `redirectPath` = where to return after login. |
| `logout()` | Logs out + redirect to `/`. Resets the signals. |
| `getToken()` | Returns the raw JWT (for `Authorization: Bearer`). |
| `getUsername()` | Returns the username as `string | undefined`. |
| `getProfile()` | First name, last name, email from `tokenParsed` — **without an API call**. |
| `refreshToken(minValidity?)` | Refreshes the token if it expires in < `minValidity` seconds (default 30). |

> The token-refresh interval helpers (`startTokenRefresh` / `stopTokenRefresh`) are private. See [`docs/auth-flow.md`](auth-flow.md) for the full flow.

---

## DTOs (models)

**File:** `src/app/core/models/offers.models.ts`

```typescript
interface LookupDto {
  id: string;
  name: string;
}
```

The base type used by all lookups (technologies, cities, job boards, ...). Returned by `LookupsApiService` and embedded in `JobOfferApiResponse` and `UserProfileDto`.

**Files with additional types:**

| File | Exported types |
|---|---|
| `core/models/offers.models.ts` | `LookupDto`, `JobOfferApiResponse` |
| `core/services/user-api.service.ts` | `UserMeDto`, `UserProfileDto`, `UserProfileUpdateDto` |
| `core/services/job-offers-api.service.ts` | `MappedOffer` |
| `shared/filters-form/filters-form.types.ts` | `FiltersValue`, `FiltersInitialState`, `ContractType`, `FILTERS_STORAGE_KEY` |
| `shared/location-picker/location-picker.component.ts` | `LocationItem` |

---

## 📚 Related documents

- [`README.md`](../README.md) — quick-start
- [`docs/architecture.md`](architecture.md) — architecture patterns
- [`docs/features.md`](features.md) — where the services are used
- [`docs/auth-flow.md`](auth-flow.md) — Keycloak + interceptor + guard
