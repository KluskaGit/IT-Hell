# 🌐 API & Services — CV_ANALIZER Frontend

Warstwa komunikacji z backendem FastAPI. Dokument opisuje wszystkie serwisy, DTO i konfigurację proxy. Uzupełnienie [głównego README](../README.md).

## 📑 Spis treści

- [Przegląd](#przegląd)
- [Proxy config (dev)](#proxy-config-dev)
- [Environment](#environment)
- [UserApiService](#userapiservice)
- [CvApiService](#cvapiservice)
- [JobOffersApiService](#joboffersapiservice)
- [LookupsApiService](#lookupsapiservice)
- [AuthService](#authservice)
- [DTOs (modele)](#dtos-modele)

---

## Przegląd

Wszystkie serwisy żyją w `src/app/core/services/` (z wyjątkiem `AuthService` w `src/features/auth/`). Każdy serwis jest **standalone singletonem** (`providedIn: 'root'`).

| Serwis | Plik | Endpointy backendu |
|---|---|---|
| `AuthService` | `src/features/auth/auth.service.ts` | (Keycloak, nie API) |
| `UserApiService` | `src/app/core/services/user-api.service.ts` | `GET/PUT /v1/users/me/profile`, `GET /v1/users/me` |
| `CvApiService` | `src/app/core/services/cv-api.service.ts` | `POST /v1/cv/upload` (multipart) |
| `JobOffersApiService` | `src/app/core/services/job-offers-api.service.ts` | `GET /v1/job-offers/get_offer_filter` |
| `LookupsApiService` | `src/app/core/services/lookups-api.service.ts` | `GET /v1/lookups/*` |

**Konwencje:**

- Metody publiczne zwracają `Observable<T>` (RxJS) — komponent decyduje czy używa `subscribe()` z `takeUntil()`, czy konwertuje przez `firstValueFrom()` na Promise.
- Brak globalnego error interceptora — błędy obsługiwane w komponentach (różne strategie dla 401/404/500).
- DTO są typowane jako TypeScript interfaces, zdefiniowane w `core/models/` lub w samym pliku serwisu.

---

## Proxy config (dev)

`frontend/proxy.conf.json`:

```json
{
  "/v1": {
    "target": "http://localhost:8000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

**Działanie:** w trybie `npm start` Angular Dev Server uruchamia własny proxy — wszystkie żądania frontendu na `/v1/*` są przepinane na `http://localhost:8000/v1/*` (bez CORS, bo z perspektywy przeglądarki to ten sam origin `localhost:4200`).

W **produkcji** ten plik nie ma znaczenia — backend i frontend powinny być za reverse proxy (nginx/Traefik) który rozpoznaje prefix `/v1`.

---

## Environment

`frontend/src/environments/environment.ts`:

```typescript
export const environment = {
  apiUrl: '/v1',
  keycloakUrl: 'http://localhost:8080',
  keycloakRealm: 'it-hell',
  keycloakClientId: 'backend-client',
};
```

| Zmienna | Wartość | Użycie |
|---|---|---|
| `apiUrl` | `/v1` | Prefix wszystkich żądań HTTP w serwisach (`${environment.apiUrl}/users/me`) |
| `keycloakUrl` | `http://localhost:8080` | URL serwera Keycloak |
| `keycloakRealm` | `it-hell` | Nazwa realmu Keycloak |
| `keycloakClientId` | `backend-client` | Public client ID dla SPA (PKCE) |

**Produkcja:** Angular CLI podmienia plik przez `fileReplacements` w `angular.json` (obecnie brak `environment.prod.ts` — do dodania przed deploymentem).

---

## UserApiService

**Plik:** `src/app/core/services/user-api.service.ts`

Operacje na profilu zalogowanego użytkownika.

### DTOs

```typescript
interface UserMeDto {
  id: string;
  id_keycloak: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserProfileDto {
  id: string;
  user_id: string;
  raw_cv: string | null;        // JSON: { name, data: base64 }
  exp_level: LookupDto | null;
  technologies: LookupDto[];
  created_at: string;
  updated_at: string;
}

interface UserProfileUpdateDto {
  exp_level_id?: string;
  technology_ids?: string[];
  raw_cv?: string;              // JSON.stringify({ name, data: base64 })
}
```

### Metody

| Metoda | HTTP | Endpoint | Zwraca |
|---|---|---|---|
| `getMe()` | `GET` | `/v1/users/me` | `Observable<UserMeDto>` |
| `getMyProfile()` | `GET` | `/v1/users/me/profile` | `Observable<UserProfileDto>` |
| `updateMyProfile(payload)` | `PUT` | `/v1/users/me/profile` | `Observable<UserProfileDto>` |

**Uwagi:**
- `getMyProfile()` zwraca **404 dla nowych użytkowników** — komponent musi obsłużyć (`catchError`).
- `updateMyProfile()` używa **upsert semantics** w backendzie — nie trzeba osobnego `createProfile()`.
- Token JWT dołączany **automatycznie** przez `authInterceptor` (`app.config.ts`).

---

## CvApiService

**Plik:** `src/app/core/services/cv-api.service.ts`

Analiza CV — wyciąga technologie i metadane.

### Metody

| Metoda | HTTP | Endpoint | Zwraca |
|---|---|---|---|
| `uploadCv(file: File)` | `POST` | `/v1/cv/upload` | `Observable<LookupDto[]>` |

**Request body:** `multipart/form-data` z polem `file` (PDF lub DOCX, max 10 MB)

**Response:** lista wykrytych technologii (`LookupDto[]`)

```typescript
[
  { id: 'tech-react', name: 'React' },
  { id: 'tech-typescript', name: 'TypeScript' },
  // ...
]
```

**Backend (informacyjnie):**
- PDF: parsowane przez `pdfplumber` (max 8 stron)
- DOCX: paragrafy + tabele + headery/stopki + text boxy
- Detekcja przez pre-compiled regex (~25 technologii z aliasami)

> 📖 Szczegóły algorytmu CV analysis — zobacz dokumentację backendu.

---

## JobOffersApiService

**Plik:** `src/app/core/services/job-offers-api.service.ts`

Lista ofert pracy z filtrami i paginacją.

### DTOs

```typescript
// Surowa odpowiedź backendu
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
  publication_date: string | null;   // ISO 8601, null gdy scraper nie podał daty
  expiration_date: string | null;    // ISO 8601, null gdy scraper nie podał daty
}

// Zmapowany model używany w UI
interface MappedOffer {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: string;
  workTypeId: string;          // ID trybu pracy (do getWorkModeLabel)
  salaryMin: number;
  salaryMax: number;
  technologies: string[];      // IDs
  technologyNames: string[];   // wyświetlane nazwy
  roles: string[];
  seniority: string;
  source: string;              // ID portalu (do formatSource)
  postedLabel: string;
  description: string;
  url?: string;
  publicationDate: string | null;   // przepisane z publication_date
  expirationDate: string | null;    // przepisane z expiration_date
}
```

### Metody

| Metoda | HTTP | Endpoint | Zwraca |
|---|---|---|---|
| `getOffers(params?)` | `GET` | `/v1/job-offers/get_offer_filter` | `Observable<JobOfferApiResponse[]>` |
| `mapToOffer(api: JobOfferApiResponse)` | — | (pure function) | `MappedOffer` |

### Query parameters

| Parametr | Typ | Opis |
|---|---|---|
| `skip` | number | offset paginacji |
| `limit` | number | rozmiar strony (default 20) |
| `salary_from_min` | number | dolny próg widełek |
| `salary_to_max` | number | górny próg widełek |
| `technology_ids[]` | string[] | filtr po technologiach |
| `specialization_ids[]` | string[] | obszar IT (backend/frontend/...) |
| `work_type_ids[]` | string[] | tryb pracy (remote/hybrid/onsite) |
| `exp_level_ids[]` | string[] | seniority |
| `site_ids[]` | string[] | portale (pracuj/jjit/nfj) |
| `location_ids[]` | string[] | miasta |
| `title` | string | wyszukiwanie po tytule (LIKE) |

### Mapowanie DTO → UI

`mapToOffer()` obsługuje:
- `null` wartości z bazy (np. brak firmy)
- String `'None'` zwracany czasem przez Pythona/FastAPI dla pustych pól
- Fallbacki: `'Nieznana firma'`, `'Zdalnie'`, `'Nie podano'`

---

## LookupsApiService

**Plik:** `src/app/core/services/lookups-api.service.ts`

Słowniki używane w formularzach (technologie, lokalizacje, specjalizacje, ...).

### Metody

Wszystkie metody zwracają `Observable<LookupDto[]>`:

| Metoda | Endpoint | Co zwraca |
|---|---|---|
| `getTechnologies()` | `GET /v1/lookups/technologies` | lista technologii (React, Vue, Python, ...) |
| `getSpecializations()` | `GET /v1/lookups/specializations` | obszary IT (Frontend Dev, DevOps, ...) |
| `getWorkTypes()` | `GET /v1/lookups/work-types` | tryby pracy (remote/hybrid/onsite) |
| `getExperienceLevels()` | `GET /v1/lookups/experience-levels` | seniority (Junior/Mid/Senior/Lead) |
| `getSites()` | `GET /v1/lookups/sites` | portale (Pracuj.pl, JustJoin.it, NoFluffJobs) |
| `getLocations()` | `GET /v1/lookups/locations` | miasta z bazy |

### Wzorzec użycia

`FiltersFormComponent` pobiera **wszystkie słowniki równolegle** przez `forkJoin()`:

```typescript
forkJoin({
  technologies: this.lookups.getTechnologies(),
  specializations: this.lookups.getSpecializations(),
  workTypes: this.lookups.getWorkTypes(),
  expLevels: this.lookups.getExperienceLevels(),
  sites: this.lookups.getSites(),
  locations: this.lookups.getLocations()
}).pipe(takeUntil(this.destroy$)).subscribe(...);
```

**Cache:** brak w samym serwisie (każde wywołanie = nowy request). Cache de-facto przez to, że `FiltersFormComponent` ładuje słowniki **raz** w `ngOnInit()` i trzyma je w properties.

---

## AuthService

**Plik:** `src/features/auth/auth.service.ts`

Centralny serwis autoryzacji. **Nie wywołuje backendu** — komunikuje się tylko z Keycloak przez `keycloak-js`.

### Stan (Signals)

```typescript
isAuthenticated: Signal<boolean>     // true gdy aktywny JWT
username: Signal<string | null>      // given_name z tokenu lub null
```

### Metody publiczne

| Metoda | Co robi |
|---|---|
| `init()` | Inicjalizuje klienta Keycloak (PKCE S256, check-sso). Wywoływana z `APP_INITIALIZER`. |
| `login(redirectPath?)` | Przekierowuje na formularz Keycloak. `redirectPath` = gdzie wrócić po loginie. |
| `logout()` | Wylogowuje + redirect na `/`. Resetuje signals. |
| `getToken()` | Zwraca surowy JWT (do `Authorization: Bearer`). |
| `getProfile()` | Imię, nazwisko, email z `tokenParsed` — **bez wywołania API**. |
| `refreshToken(minValidity?)` | Odświeża token jeśli wygasa za < `minValidity` sekund (default 30). |
| `startTokenRefresh()` | Uruchamia `setInterval(20s)` automatycznego refresh. |
| `stopTokenRefresh()` | `clearInterval` (wywołane w `logout()`). |

> 🔐 Pełen flow autoryzacji opisany w [`docs/auth-flow.md`](auth-flow.md).

---

## DTOs (modele)

**Plik:** `src/app/core/models/offers.models.ts`

```typescript
interface LookupDto {
  id: string;
  name: string;
}
```

Podstawowy typ używany przez wszystkie słowniki (technologie, miasta, portale, ...). Zwracany przez `LookupsApiService` i embedowany w `JobOfferApiResponse`, `UserProfileDto`.

**Pliki z dodatkowymi typami:**

| Plik | Eksportowane typy |
|---|---|
| `core/models/offers.models.ts` | `LookupDto`, `JobOfferApiResponse` |
| `core/services/user-api.service.ts` | `UserMeDto`, `UserProfileDto`, `UserProfileUpdateDto` |
| `core/services/job-offers-api.service.ts` | `MappedOffer` |
| `shared/filters-form/filters-form.types.ts` | `FiltersValue`, `FiltersInitialState`, `ContractType`, `FILTERS_STORAGE_KEY` |
| `shared/location-picker/location-picker.component.ts` | `LocationItem` |

---

## 📚 Powiązane dokumenty

- [`README.md`](../README.md) — quick-start
- [`docs/architecture.md`](architecture.md) — wzorce architektury
- [`docs/features.md`](features.md) — gdzie serwisy są używane
- [`docs/auth-flow.md`](auth-flow.md) — Keycloak + interceptor + guard
