# ✨ Features — CV_ANALIZER Frontend

Dokument opisuje wszystkie strony (`features/`) i komponenty współdzielone (`shared/`). Uzupełnienie [głównego README](../README.md).

## 📑 Spis treści

- [HOME — strona główna](#-home--strona-główna)
- [OFFERS — lista ofert pracy](#-offers--lista-ofert-pracy)
- [PROFILE — profil użytkownika](#-profile--profil-użytkownika)
- [ABOUT — strona informacyjna](#-about--strona-informacyjna)
- [LEGAL — regulamin i FAQ](#-legal--regulamin-i-faq)
- [Shared Components](#-shared-components)

---

## 🏠 HOME — strona główna

**Ścieżka:** `src/features/home/`
**Route:** `/`
**SSR mode:** `Prerender`

### Pliki

| Plik | Co robi |
|---|---|
| `home.component.ts` | Logika drop CV, animacja skanowania, integracja z `FiltersFormComponent` |
| `home.component.html` | Hero + dropzone + animacja skanu + formularz filtrów + feature cards |
| `home.component.css` | Gradienty tekstu, animowane glow w tle, glassmorphism kart |

### Funkcjonalność

Punkt wejścia aplikacji. Cel: **pozwolić użytkownikowi w jednej akcji** wgrać CV (PDF lub DOCX, max 10 MB) i przejść do listy dopasowanych ofert. Po dropie pliku:

1. Plik wysyłany do `CvApiService.uploadCv(file)` → backend zwraca listę technologii.
2. Wykryte technologie są patchowane do `FiltersFormComponent` (`patchValue()` przez `@ViewChild`).
3. Użytkownik może doprecyzować filtry (seniority, salary, lokalizacja).
4. Klik **„Szukaj dopasowanych ofert"** → `router.navigate(['/offers'], { state: { filters } })`.

Dodatkowo dla zalogowanych: przycisk **„Uzupełnij z profilu"** — pobiera zapisany CV i preferencje z `/v1/users/me/profile` zamiast wgrywania od nowa.

### Kluczowe interakcje

- **Drag & drop:** handlery `onDragOver`, `onDragLeave`, `onDrop` na `<div class="dropzone">` — klasa `isDragging` steruje highlightem
- **Animacja skanowania:** `analyzeCV()` — sztuczna progress bar (`setTimeout` 35% → 65% → 100%) wzmacniająca poczucie "AI thinking"
- **Integracja z formularzem:** `@ViewChild(FiltersFormComponent) filtersFormRef` + `filtersFormRef.patchTechnologies(ids)`
- **localStorage:** filtry zapisywane pod kluczem `cv_analizer_candidate_filters` (z `filters-form.types.ts`)
- **Auth-aware UI:** `isAuthenticated()` (Signal z `AuthService`) — warunkowe wyświetlenie przycisku „Uzupełnij z profilu"

### UI highlights

- **Hero section** z `text-gradient` (background-clip: text, indigo → fioletowy)
- **Dwa animowane glow blobs** w tle (CSS `glowFloat` keyframes, `backdrop-filter: blur(60px)`)
- **Success banner** po udanej analizie (checkmark + wykryte technologie)
- **Feature cards** — 3 boksy z emoji prezentujące główne wartości (analiza CV, multi-portal, smart match)

---

## 💼 OFFERS — lista ofert pracy

**Ścieżka:** `src/features/offers/`
**Route:** `/offers`
**SSR mode:** `Client` ⚠️

### Pliki

| Plik | Co robi |
|---|---|
| `offers.component.ts` | Logika filtrów, paginacja, infinite scroll, resizable sidebar (628+ linii) |
| `offers.component.html` | Dwukolumnowy layout: sidebar z filtrami + lista ofert |
| `offers.component.css` | Responsive grid, drag handle, glassmorphism kart ofert |

### Funkcjonalność

Centralna strona aplikacji. Wyświetla oferty pracy ze **wszystkich portali** (Pracuj.pl, JustJoin.it, NoFluffJobs) z **zaawansowanym filtrowaniem**:

- **Specjalizacja IT** (backend dev, frontend dev, devops, qa, mobile, ...)
- **Seniority** (Junior, Mid, Senior, Lead) — multi-checkbox
- **Technologie** — multi-select z autocomplete
- **Tryb pracy** (zdalnie, hybrydowo, biuro)
- **Portal źródłowy** — checkboxy (goście widzą tylko Pracuj.pl, zalogowani wszystkie)
- **Lokalizacja** — autocomplete z listą miast
- **Widełki wynagrodzenia** — slider z 26 opcjami (`SALARY_OPTIONS`, nieregularny krok 0-50k PLN)
- **Wyszukiwanie po tytule** — debounce 500 ms

### Kluczowe interakcje

- **Forms:** `ReactiveFormsModule` + reużywalny `FiltersFormComponent`
- **Infinite scroll:** `IntersectionObserver` obserwuje `#scrollSentinel` na dole listy — gdy widoczny, ładuje kolejne 20 ofert (`rootMargin: 200px`)
- **Resizable sidebar:** mouse drag (`onDragStart` → `onDragMove` → `onDragEnd`) z zapisem szerokości w `localStorage` (klucz `cv_offers_sidebar_width`, zakres 240-480 px)
- **Debouncing filtrów:** `filtersTrigger$` (Subject) → `debounceTime(700)` → `switchMap()` → request do API
- **URL sync:** `router.navigate(['.', { queryParams }])` z `replaceUrl: true` — kopiowalne linki do filtrów
- **Client-side filtering:** widełki płacowe filtrowane na froncie (server zwraca pełną stronę, klient ucina)
- **Sortowanie:** oferty z widełkami malejąco po `salaryMax`, bez widełek alfabetycznie po tytule
- **Matched badges:** `matchedTech[]` i `matchedRoles[]` — wyróżnienie technologii pasujących do filtrów (border + glow)

### Model widoku

Interfejs `OfferViewModel extends MappedOffer` rozszerza DTO o:

```typescript
matchedTech: string[];      // ID technologii z filtrów które pasują do oferty
matchedRoles: string[];     // pasujące role/specjalizacje
```

`MappedOffer` (`src/app/core/models/offers.models.ts`):

```typescript
{
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: string;
  salaryMin?: number;
  salaryMax?: number;
  technologies: string[];
  technologyNames: string[];
  roles: string[];
  seniority: string;
  source: string;            // 'pracuj' | 'justjoin' | 'nofluff'
  postedLabel: string;
  description: string;
  url?: string;
}
```

---

## 👤 PROFILE — profil użytkownika

**Ścieżka:** `src/features/profile/`
**Route:** `/profile` (chroniony `authGuard`)
**SSR mode:** `Prerender`

### Pliki

| Plik | Co robi |
|---|---|
| `profile.component.ts` | Upload CV, formularz preferencji, save flow do `/v1/users/me/profile` |
| `profile.component.html` | Dane usera (z JWT) + drag-drop CV + uproszczony formularz filtrów |
| `profile.component.css` | Layout jednokolumnowy, sekcje karty |

### Funkcjonalność

Strona dla **zalogowanego użytkownika** — pozwala zapisać CV i preferencje **na stałe w bazie**, aby następnym razem wystarczyło jedno kliknięcie „Uzupełnij z profilu" na stronie głównej.

### Sekcje

1. **Dane podstawowe (read-only):** email, imię, nazwisko — czytane z **tokenu JWT** (bez wywołania API) przez `authService.getProfile()`. Natychmiastowe wyświetlenie.
2. **Upload CV:** dropzone identyczny jak na `/home`, animacja skanowania, wyświetlanie daty ostatniego uploadu.
3. **Preferencje:** `FiltersFormComponent` z `singleExpLevelSelection=true` (radio zamiast checkbox dla seniority) i ukrytymi sekcjami portali/widełek (tylko seniority + technologie).
4. **Przyciski:** „Zapisz" (PUT do backendu) + „Anuluj".

### Save flow

1. Walidacja po stronie klienta (forma `valid`).
2. `UserApiService.updateMyProfile({ exp_level_id, technology_ids })` → `PUT /v1/users/me/profile`.
3. Sukces → `saveSuccess = true` (toast widoczny 3 s, auto-hide).
4. Błąd → `saveError = err.message`.

### Two-stage load

```
ngOnInit() →
  initFromToken()          // natychmiast (JWT)
  loadUserDataFromBackend()  // async (GET /v1/users/me + GET /v1/users/me/profile)
```

`404` z `/v1/users/me/profile` jest **oczekiwany dla nowych użytkowników** — formularz startuje pusty.

---

## ℹ️ ABOUT — strona informacyjna

**Ścieżka:** `src/features/about/`
**Route:** `/about`
**SSR mode:** `Prerender`

Strona statyczna z opisem projektu, technologii i zespołu. **Brak logiki, brak API.**

Importuje tylko `NavbarComponent` i `FooterComponent`. Cały content w `about.component.html`.

---

## 📜 LEGAL — regulamin i FAQ

**Ścieżka:** `src/features/legal/`
**Route:** `/legal`
**SSR mode:** `Prerender`

Dwie zakładki:
1. **„Jak korzystać"** — 4 kroki użytkowania platformy
2. **„Regulamin"** — FAQ z 6 pytaniami (bezpłatność, źródła ofert, prywatność CV, konta, dane, polityka)

### Kluczowe interakcje

- **Sterowanie zakładkami przez URL:** `?tab=how` lub `?tab=terms` (subskrypcja `queryParamMap`)
- **`replaceUrl: true`** przy zmianie zakładki — nie zaśmieca historii przeglądarki
- **Expandable FAQ:** kliknięcie pytania toggle'uje `expandedIndex` (jedno pytanie otwarte na raz)
- **Dane statyczne:** `steps[]`, `features[]`, `faq[]` jako properties w klasie (brak API)

---

## 🧩 Shared Components

Komponenty wielokrotnego użytku z `src/app/shared/`.

### FiltersFormComponent ⭐

**Ścieżka:** `src/app/shared/filters-form/`

**Używany przez:** Home, Offers, Profile

To **najważniejszy shared component** w projekcie. Reaktywny formularz filtrów zbudowany na `ReactiveFormsModule`, obsługuje wszystkie pola wymagane do dopasowania ofert.

**Typy (z `filters-form.types.ts`):**

```typescript
FILTERS_STORAGE_KEY = 'cv_analizer_candidate_filters';

interface FiltersValue {
  expLevel: Record<string, boolean>;          // { junior: true, mid: false, ... }
  technologies: string[];                     // ID
  itAreas: Record<string, boolean>;
  workMode: { remote: boolean; hybrid: boolean; onsite: boolean };
  jobSites: Record<string, boolean>;          // pracuj/jjit/nfj
  locations: LocationItem[];
  salaryFromIndex: number;                    // index w SALARY_OPTIONS
  salaryToIndex: number;
  noticePeriod: string;                       // 'immediate' | '2weeks' | '1month'
  isStudent: boolean;
  search: string;
}

type FiltersInitialState = Partial<FiltersValue>;
```

**Inputs (kontrola widoczności sekcji):**

| Input | Default | Opis |
|---|---|---|
| `showApplyButton` | `true` | Przycisk „Szukaj" |
| `showProfileFillButton` | `false` | Przycisk „Uzupełnij z profilu" (tylko home dla zalogowanych) |
| `singleExpLevelSelection` | `false` | `true` na `/profile` (radio zamiast checkbox) |
| `showLocation`, `showTechnologies`, `showSites`, `showSalary` | `true` | Ukrywanie sekcji na `/profile` |
| `initialState` | `null` | Pre-fill formularza (z localStorage lub state) |

**Outputs:**

| Output | Kiedy emitowany |
|---|---|
| `filtersChange` | Przy każdej zmianie formularza (debounced w komponencie nadrzędnym) |
| `ready` | Raz, po pierwszej inicjalizacji (offers czeka na to przed pierwszym fetchem) |
| `applyClicked` | Klik „Szukaj" |
| `profileFillClicked` | Klik „Uzupełnij z profilu" |

**Architektura:**

- `forkJoin()` równolegle pobiera wszystkie słowniki (`LookupsApiService`) — technologie, role, lokalizacje, portale, seniority, tryby pracy
- Deduplikacja błędów backendu (powtarzające się ID)
- Pickery zewnętrzne: `LocationPickerComponent`, `TechPickerComponent`
- Salary slider z 26 opcjami (nieregularny krok zaprojektowany pod rynek IT: 0, 3k, 5k, 7k, ..., 30k, 35k, 40k, 50k+)
- Dwuetapowy render TechPickera przez `queueMicrotask()` (anti-flicker przy hydration)

---

### NavbarComponent

**Ścieżka:** `src/app/shared/navbar/`

Górna belka obecna na każdej stronie. Logo, linki nawigacyjne (`/`, `/offers`, `/about`, `/legal`), warunkowy przycisk login/logout.

**Gettery:**
- `isAuthenticated()` — z `AuthService` (Signal)
- `username()` — z `AuthService` (Signal)

**Akcje:**
- `login()` → `authService.login(currentPath)` (Keycloak redirect z powrotem na bieżącą stronę)
- `logout()` → `authService.logout()` (Keycloak redirect na `/`)

---

### FooterComponent

**Ścieżka:** `src/app/shared/footer/`

Stopka na każdej stronie. Linki do `/about`, `/legal`, copyright, nazwa projektu.

Brak logiki — czysto prezentacyjny.

---

### TechPickerComponent

**Ścieżka:** `src/app/shared/tech-picker/`

Multi-select z autocomplete dla **technologii**. Wyświetla wybrane jako tagi (z możliwością usunięcia kliknięciem `×`), dropdown z filtrowaniem po nazwie, badge z liczbą wybranych.

**Inputs:**
- `options: LookupDto[]` — pełna lista technologii
- `selectedIds: string[]` — ID aktualnie wybranych

**Outputs:**
- `selectionChange` — emit przy każdej zmianie

---

### LocationPickerComponent

**Ścieżka:** `src/app/shared/location-picker/`

Multi-select z autocomplete dla **miast/lokalizacji**. Identyczna logika i wygląd jak TechPicker. Praca zdalna jest osobnym checkboxem (`workMode.remote`), nie lokalizacją.

---

### highlight.ts

**Ścieżka:** `src/app/shared/highlight.ts`

Helper function do podświetlania fragmentów tekstu w wynikach wyszukiwania (np. tytuły ofert pasujące do query). Zwraca HTML z `<mark>` wokół trafień.

---

## 📚 Powiązane dokumenty

- [`README.md`](../README.md) — quick-start
- [`docs/architecture.md`](architecture.md) — wzorce Angular
- [`docs/api-services.md`](api-services.md) — serwisy API używane przez features
- [`docs/auth-flow.md`](auth-flow.md) — Keycloak flow
