# ✨ Features — CV_ANALIZER Frontend

Szczegółowa dokumentacja wszystkich stron (`features/`) i komponentów współdzielonych (`shared/`). Każdy podrozdział opisuje: pliki, stan komponentu, kluczowe metody, flow użytkownika i pułapki implementacyjne.

Uzupełnienie [głównego README](../README.md) oraz [`docs/architecture.md`](architecture.md).

## 📑 Spis treści

- [Mapa features](#-mapa-features)
- [HOME `/` — strona główna](#-home---strona-główna)
- [OFFERS `/offers` — lista ofert](#-offers-offers--lista-ofert)
- [PROFILE `/profile` — profil użytkownika](#-profile-profile--profil-użytkownika)
- [ABOUT `/about` — strona informacyjna](#-about-about--strona-informacyjna)
- [LEGAL `/legal` — regulamin i FAQ](#-legal-legal--regulamin-i-faq)
- [Shared: FiltersFormComponent](#-shared-filtersformcomponent-)
- [Shared: NavbarComponent](#-shared-navbarcomponent)
- [Shared: FooterComponent](#-shared-footercomponent)
- [Shared: TechPickerComponent](#-shared-techpickercomponent)
- [Shared: LocationPickerComponent](#-shared-locationpickercomponent)
- [Shared: highlight.ts](#-shared-highlightts)

---

## 🗺️ Mapa features

| Strona | Route | SSR mode | Auth | Główne zadanie |
|---|---|---|---|---|
| Home | `/` | Prerender | — | Drop CV + analiza + przejście do ofert |
| Offers | `/offers` | **Client** | — | Lista ofert z filtrami + infinite scroll + resizable sidebar |
| Profile | `/profile` | Prerender | ✅ `authGuard` | Edycja danych + zapis CV + preferencji do bazy |
| About | `/about` | Prerender | — | Statyczna prezentacja projektu |
| Legal | `/legal` | Prerender | — | Regulamin, FAQ, instrukcja użytkowania (2 zakładki) |

| Shared | Plik | Cel |
|---|---|---|
| FiltersFormComponent | `app/shared/filters-form/` | Reużywalny formularz filtrów (home/offers/profile) |
| NavbarComponent | `app/shared/navbar/` | Górna belka z login/logout |
| FooterComponent | `app/shared/footer/` | Stopka z linkami |
| TechPickerComponent | `app/shared/tech-picker/` | Multi-select technologii z autocomplete |
| LocationPickerComponent | `app/shared/location-picker/` | Multi-select miast z autocomplete |
| highlight.ts | `app/shared/highlight.ts` | Helper do bezpiecznego podświetlania `<strong>` (XSS-safe) |

---

## 🏠 HOME — strona główna

**Ścieżka:** `src/features/home/`
**Route:** `/`
**SSR mode:** `Prerender`

### Pliki

| Plik | Opis |
|---|---|
| `home.component.ts` | Logika dropzone CV, animacja skanowania, fillFromProfile, integracja z FiltersFormComponent |
| `home.component.html` | Hero + dropzone + animacja skanu + formularz filtrów + 3 feature cards |
| `home.component.css` | Glassmorphism, gradienty, animowane glow w tle |

### Stałe modułu

```typescript
const MAX_CV_SIZE_MB = 10;
const MAX_CV_SIZE_BYTES = MAX_CV_SIZE_MB * 1024 * 1024;
```

Limit 10 MB to kompromis: większość CV w PDF/DOC mieści się, a większe pliki spowalniają backend.

### Stan komponentu

| Pole | Typ | Cel |
|---|---|---|
| `selectedFile` | `File \| null` | Wgrany plik CV po walidacji |
| `uploadError` | `string \| null` | Błąd walidacji (zły format / za duży) |
| `isDragging` | `boolean` | Czy użytkownik aktualnie przeciąga plik nad dropzone |
| `isScanning` | `boolean` | Czy trwa upload + animacja (true od POST do końca animacji) |
| `scanProgress` | `number` | 0–100, steruje paskiem postępu |
| `scanStatus` | `string` | Tekst nad paskiem: „Analiza CV..." → „Zakończono!" |
| `scanComplete` | `boolean` | Czy pokazać baner sukcesu |
| `isFillingFromProfile` | `boolean` | Blokada wielokrotnych kliknięć „Uzupełnij z profilu" |
| `fillProfileError` | `string \| null` | Błąd fillFromProfile |
| `savedFilters` | `FiltersInitialState \| null` | Stan przekazany do `<app-filters-form [initialFilters]>` |

### Kluczowe metody

#### `handleFile(file: File)` — walidacja przed uploadem

```
1. Sprawdza rozszerzenie (.pdf / .doc / .docx, case-insensitive)
2. Sprawdza rozmiar (≤ 10 MB)
3. Jeśli OK → uploadError = null, selectedFile = file, analyzeCV(file)
4. Jeśli błąd → uploadError = komunikat po polsku, return
```

#### `analyzeCV(file: File)` — upload + sztuczna animacja postępu

```
1. isScanning = true, scanProgress = 0, scanStatus = 'Analiza CV...'
2. setTimeout 200ms → scanProgress = 35 (sygnał że coś się dzieje)
3. cvApi.uploadCv(file).subscribe({
     next: (techs) => {
       scanProgress = 100, scanStatus = 'Zakończono!'
       setTimeout 150ms → przełącz na baner, patchValue selectedTechnologies, autoFillForm()
     },
     error: () => {
       scanProgress = 100, scanStatus = 'Nie udało się...'
       setTimeout 150ms → reset (isScanning=false, selectedFile=null)
     }
   })
```

> ⚠️ Backend nie zwraca progressu w czasie rzeczywistym — animacja jest **fałszywa**. Skok do 35% to czysto UX (użytkownik widzi że coś się dzieje), opóźnienie 150 ms po odpowiedzi to czas żeby zobaczył „100% Zakończono!".

Wszystkie timery są pushowane do `scanTimers[]` i clearowane w `ngOnDestroy` — bez tego callback timera może uruchomić się po zniszczeniu komponentu.

#### `fillFromProfile()` — pobranie preferencji z backendu

```
1. Guard: isPlatformBrowser + isAuthenticated() (Keycloak)
2. isFillingFromProfile = true
3. await userApi.getMyProfile() (GET /v1/users/me/profile)
4. Zmapuj technologie: { id, name } (format LocationItem)
5. expLevelId = profile.exp_level?.id ?? ''
6. Spread aktualnych filtrów (filtersFormRef.computeValue())
   + nadpisz: selectedTechnologies, technologies (Record), seniority (Record)
7. patchValue na FiltersFormComponent
8. autoFillForm() (zapis do localStorage)
9. cdr.markForCheck() (bo to async callback)
```

> 💡 Spread `...computeValue()` zachowuje filtry które użytkownik już ręcznie ustawił (lokalizacja, salary), nadpisuje tylko seniority i technologie z profilu.

#### `onSubmit(value: FiltersValue)` — klik „Szukaj"

```typescript
saveFilters(value);  // zapis do localStorage pod FILTERS_STORAGE_KEY
router.navigate(['/offers'], {
  state: { filters: value, cvFileName: this.selectedFile?.name ?? null }
});
```

Filtry są przekazywane przez **`history.state`** — `OffersComponent.ngOnInit()` odczyta je jako jedno ze źródeł (priorytet: URL > history.state > localStorage > `{}`).

### Drag & Drop API

| Handler | Co robi |
|---|---|
| `onDragOver(e)` | `e.preventDefault()` (bez tego `drop` jest ignorowany), `isDragging = true` |
| `onDragLeave(e)` | `e.preventDefault()`, `isDragging = false` |
| `onDrop(e)` | `e.preventDefault()`, pobierz `dataTransfer.files[0]`, `handleFile(file)` |
| `onFileSelected(e)` | Handler ukrytego `<input type="file">` wyzwalanego kliknięciem dropzone |

### Integracja z FiltersFormComponent

```html
<app-filters-form
  [initialFilters]="savedFilters"
  [showApplyButton]="true"
  applyButtonLabel="Szukaj dopasowanych ofert"
  [showProfileFillButton]="isAuthenticated()"
  profileFillButtonLabel="Uzupełnij z profilu"
  (profileFillClicked)="fillFromProfile()"
  (applyClicked)="onSubmit($event)">
</app-filters-form>
```

`@ViewChild(FiltersFormComponent) filtersFormRef` daje dostęp do:
- `filtersFormRef.computeValue()` — odczyt aktualnego stanu
- `filtersFormRef.patchValue({ selectedTechnologies })` — programatyczna aktualizacja po analizie CV

### Cykl życia

```
ngOnInit:
  guard SSR → return
  router.events.subscribe(takeUntil) → markForCheck() przy każdej nawigacji

ngOnDestroy:
  scanTimers.forEach(clearTimeout)
  destroy$.next() + complete()
```

### UI highlights

- **Hero** z `text-gradient` (background-clip: text, indigo → fiolet)
- **2 background glow blobs** (CSS keyframes `glowFloat`, `backdrop-filter: blur(60px)`)
- **Dropzone z animacją radaru** podczas skanowania (`radar-sweep`, klasa `radar-done` zatrzymuje przy 100%)
- **3 feature cards** w sekcji marketingowej (Smart Scraper / Analiza CV / Twoje filtry)

---

## 💼 OFFERS `/offers` — lista ofert

**Ścieżka:** `src/features/offers/`
**Route:** `/offers`
**SSR mode:** `Client` ⚠️ (wymaga `IntersectionObserver`, `localStorage`, `history.state`)

### Pliki

| Plik | Opis |
|---|---|
| `offers.component.ts` | Filtry + paginacja + infinite scroll + resizable sidebar (628+ linii) |
| `offers.component.html` | Sidebar z filtrami (resize handle) + lista ofert (`#mainScroll` + `#scrollSentinel`) |
| `offers.component.css` | Responsive grid, drag handle, glassmorphism kart, pasek górny sticky |

### Stałe modułu

```typescript
const MAX_SALARY = 50000;  // synchronizowane z SALARY_OPTIONS w FiltersFormComponent
```

### Interfejs ViewModel

```typescript
interface OfferViewModel extends MappedOffer {
  matchedTech: string[];   // ID technologii oferty pasujące do filtrów (do badge'a)
  matchedRoles: string[];  // ID ról oferty pasujące do filtrów
}
```

### Stan komponentu

| Pole | Typ | Cel |
|---|---|---|
| `initialFilters` | `FiltersInitialState \| null` | Stan przekazany do FiltersFormComponent przy pierwszym renderze |
| `currentFilters` | `FiltersValue \| null` | Pełny stan filtrów po każdej zmianie |
| `allOffers` | `MappedOffer[]` | Wszystkie pobrane oferty (akumulowane przy infinite scroll) |
| `matchedOffers` | `OfferViewModel[]` | Przefiltrowane klient-side + wzbogacone o matched |
| `searchQuery` | `string` | Tekst w wyszukiwarce tytułu |
| `searchFocused` | `boolean` | Stylowanie aktywnego pola search |
| `isLoading` | `boolean` | Spinner głównej listy (pierwsza strona) |
| `isLoadingMore` | `boolean` | Mały spinner pod listą (kolejne strony) |
| `loadError` | `string \| null` | Polski komunikat błędu API |
| `currentPage` | `number` | Numer załadowanej strony (0 = pierwsza) |
| `hasMore` | `boolean` | false gdy ostatnia odpowiedź < pageSize |
| `pageSize` | `readonly 20` | Rozmiar paginacji (skip/limit) |
| `isFiltersVisible` | `boolean` | Toggle sidebar |
| `sidebarWidth` | `number` | Aktualna szerokość px (clamp 240–480) |
| `isSidebarDragging` | `boolean` | Czy trwa przeciąganie uchwytu |

### Resizable sidebar — szczegóły

**Stałe:**
```typescript
SIDEBAR_KEY     = 'cv_offers_sidebar_width';
SIDEBAR_MIN     = 240;
SIDEBAR_MAX     = 480;
SIDEBAR_DEFAULT = 340;
```

**Mechanizm drag (mouse-based):**

```
onDragStart(event):
  preventDefault()  // blokada zaznaczania tekstu
  isSidebarDragging = true
  dragStartX = event.clientX
  dragStartWidth = sidebarWidth
  document.addEventListener('mousemove', boundMove)   // globalne! żeby działało poza uchwytem
  document.addEventListener('mouseup', boundEnd)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

onDragMove(event):
  delta = event.clientX - dragStartX
  sidebarWidth = clamp(MIN, MAX, dragStartWidth + delta)
  cdr.markForCheck()

onDragEnd():
  isSidebarDragging = false
  document.removeEventListener('mousemove', boundMove)
  document.removeEventListener('mouseup', boundEnd)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  localStorage.setItem(SIDEBAR_KEY, String(sidebarWidth))
```

> ⚠️ **Krytyczna pułapka:** `boundMove` i `boundEnd` to **stałe referencje** utworzone w polach klasy przez `.bind(this)`. Bez tego `removeEventListener` nie mógłby znaleźć listenera (każde `.bind()` tworzy nową referencję funkcji).

`loadSidebarWidth()` w `ngOnInit` odczytuje zapisaną wartość i clampuje do MIN-MAX (na wypadek gdyby stałe zmieniły się od poprzedniej wizyty).

### Infinite scroll — IntersectionObserver

Setter `@ViewChild('scrollSentinel')` jest wywoływany przez Angular **dynamicznie** (sentinel pojawia się i znika z DOM):

```typescript
set scrollSentinel(el) {
  if (el?.nativeElement === this.sentinelEl) return;  // bez zmiany - skip
  this.intersectionObserver?.disconnect();             // rozłącz poprzedni
  this.sentinelEl = el?.nativeElement;
  if (this.sentinelEl && isPlatformBrowser(this.platformId)) {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) this.loadMore(); },
      {
        root: this.mainScrollRef?.nativeElement ?? null,
        rootMargin: '200px',  // ładuj 200px przed dotarciem do końca
        threshold: 0,
      }
    );
    this.intersectionObserver.observe(this.sentinelEl);
  }
}
```

`rootMargin: '200px'` — observer reaguje gdy sentinel jest 200px przed wejściem w viewport, co eliminuje pauzę podczas scrollowania.

### Źródła filtrów — priorytety

W `ngOnInit` subskrypcja `route.queryParamMap`:

```
1. URL query params (?roles=...&tech=...)   ← najwyższy priorytet (shareable links)
2. history.state.filters                     ← przekazane z home przez router.navigate
3. localStorage (FILTERS_STORAGE_KEY)        ← ostatnio zapisane filtry
4. {} (puste)                                ← pierwsze wejście
```

Sprawdzane raz: `if (this.initialFilters) return;` chroni przed kolejnymi emisjami (np. po `updateUrl()`).

### URL sync — skrócone klucze

`buildQueryParams(value)` używa krótkich aliasów (URL musi być czytelny):

| Pełna nazwa | URL alias |
|---|---|
| `specializationIds` | `roles` |
| `expLevelIds` | `seniority` |
| `workTypeIds` | `wm` |
| `siteIds` | `sites` |
| `locationIds` | `loc` |
| `technologyIds` | `tech` |
| `salaryFromIndex` | `salFrom` |
| `salaryToIndex` | `salTo` |

`null` oznacza „usuń ten parametr z URL" gdy filtr nie jest aktywny.

`urlToFilters(params)` — operacja odwrotna. `getIds(key)` obsługuje oba formaty: `?tech=a&tech=b` ORAZ `?tech=a,b` (split przecinkiem).

### Debouncing

Dwa osobne Subjecty z różnymi opóźnieniami:

```typescript
filtersTrigger$.pipe(skip(1), debounceTime(700)).subscribe(value => {
  updateUrl(value);
  resetAndLoad(value);
});

searchTrigger$.pipe(debounceTime(500)).subscribe(() => {
  if (this.currentFilters) this.resetAndLoad(this.currentFilters);
});
```

- **Filtry: 700 ms** — użytkownik klika kilka checkboxów pod rząd
- **Search: 500 ms** — krótszy bo wyszukiwanie powinno reagować szybciej
- **`skip(1)`** — pomija pierwszą emisję, bo pierwsze ładowanie uruchamia `onFiltersReady()` (bez tego: podwójne ładowanie przy starcie)

### Filtrowanie klient-side: salary

`computeMatchedOffers()` filtruje lokalnie tylko po widełkach:

```typescript
isSalaryInRange(offer, filters):
  if (offer.salaryMin === 0 && offer.salaryMax === 0) return true;  // brak widełek = OK
  return offer.salaryMax >= filters.salaryFrom && offer.salaryMin <= filters.salaryTo;
```

> 💡 Oferty bez podanych widełek **zawsze przechodzą** — ukrywanie ich byłoby złym UX bo pracodawca po prostu nie ujawnił widełek.

### Sortowanie

```typescript
sortBatch(offers):
  oferty z salary → malejąco po salaryMax
  oferty bez salary → na końcu, alfabetycznie po title (locale 'pl')
```

### Wzbogacanie ofert o `matchedTech`/`matchedRoles`

```typescript
toOfferViewModel(offer, filters):
  selectedRoles = klucze z filters.itArea gdzie wartość true
  selectedTech  = klucze z filters.technologies gdzie wartość true
  matchedRoles  = offer.roles.filter(r => selectedRoles.includes(r))
  matchedTech   = offer.technologies.filter(t => selectedTech.includes(t))
  return { ...offer, matchedRoles, matchedTech }
```

W szablonie tagi technologii dostają klasę `tag--match` jeśli `offer.matchedTech.includes(tech)` — wizualnie wyróżnione (border + glow).

### Otwieranie ofert zewnętrznych

```typescript
openOffer(offer):
  if (offer.url && isPlatformBrowser) {
    window.open(offer.url, '_blank', 'noopener,noreferrer');
  }
```

- `noopener` — nowa karta nie ma dostępu do `window.opener`
- `noreferrer` — nie wysyła nagłówka `Referer` do zewnętrznego serwisu

### Formatery delegowane

`formatRole(key)`, `formatTech(key)`, `formatSource(key)`, `getWorkModeLabel(id)` delegują do `filtersFormRef` ponieważ to **tam są załadowane słowniki** z backendu. Fallback: zwraca surowy klucz.

### TrackBy w `*ngFor`

```typescript
trackOffer(_, offer) → offer.id
trackByString(_, value) → value
```

Bez `trackBy` Angular niszczy i tworzy wszystkie elementy listy przy każdej zmianie — bardzo nieefektywne przy 20+ kartach z animacjami.

### Cykl życia

```
ngOnInit:
  guard SSR → return
  loadSidebarWidth()
  router.events → markForCheck (na nawigację)
  filtersTrigger$ → skip(1) + debounce 700ms → updateUrl + resetAndLoad
  searchTrigger$ → debounce 500ms → resetAndLoad
  route.queryParamMap → ustal źródło filtrów

ngOnDestroy:
  destroy$.next() + complete()
  intersectionObserver?.disconnect()
  document.removeEventListener('mousemove', boundMove)
  document.removeEventListener('mouseup',   boundEnd)
```

---

## 👤 PROFILE `/profile` — profil użytkownika

**Ścieżka:** `src/features/profile/`
**Route:** `/profile` (chroniony `authGuard`)
**SSR mode:** `Prerender`

### Pliki

| Plik | Opis |
|---|---|
| `profile.component.ts` | 2-etapowy load, CV upload, save flow do `/v1/users/me/profile` |
| `profile.component.html` | Dane z JWT + drag-drop CV + uproszczony FiltersFormComponent |
| `profile.component.css` | Layout jednokolumnowy, sekcje karty |

### Stan komponentu

| Pole | Typ | Cel |
|---|---|---|
| `email`, `firstName`, `lastName` | `string` | Dane z JWT/backendu (read-only w UI) |
| `currentCvFile` | `string \| null` | Nazwa wgranego pliku CV |
| `currentCvDate` | `string` | Data uploadu (pl-PL format) |
| `isDragging`, `isScanning`, `scanProgress`, `scanStatus`, `scanComplete` | — | Tak jak na home |
| `savedFilters` | `FiltersInitialState \| null` | Stan dla FiltersFormComponent |
| `currentFilterValue` | `FiltersValue \| null` | Aktualizowane przez (filtersChange), używane przy save |
| `isSaving` | `boolean` | Disable przycisku Zapisz |
| `loadError`, `saveError`, `saveSuccess` | `string \| null` | Komunikaty UI |

### Two-stage load

```
ngOnInit:
  isPlatformBrowser guard
  initFromToken()                ← synchronicznie z JWT
  await loadUserDataFromBackend()  ← async z API
```

**`initFromToken()`:**
```typescript
const profile = this.authService.getProfile();  // czyta tokenParsed
this.email     = profile.email;
this.firstName = profile.firstName ?? '';
this.lastName  = profile.lastName  ?? '';
```

> 💡 Imię i email są dostępne **natychmiast** z JWT — nie czekamy na backend dla podstawowych pól. To skraca czas do pierwszego sensownego widoku.

**`loadUserDataFromBackend()`:**
```
try:
  me = await userApi.getMe()                  ← GET /v1/users/me
  patchUserData(me)                            ← nadpisz dane z tokenu
  try:
    profile = await userApi.getMyProfile()    ← GET /v1/users/me/profile
    patchProfileData(profile)
  catch (err):
    if err.status === 404:
      savedFilters = { selectedTechnologies: [], technologies: {}, seniority: {} }
      return    ← 404 oczekiwany dla nowych użytkowników
    throw err   ← inne błędy propagujemy
catch (err):
  loadError = 'Nie udało się pobrać danych profilu z backendu.'
```

> ⚠️ **404 to NIE błąd** — nowy użytkownik nigdy nie zapisał profilu. Wewnętrzny try/catch obsługuje to gracefully.

### CV upload flow

Identyczny mechanizm jak na home (`handleFile` + `analyzeCV`), ale z dwoma różnicami:

1. **Po sukcesie:** synchronizuje `currentFilterValue` z nowymi technologiami żeby `onSave()` miał aktualne dane (bez tego stan formularza i `currentFilterValue` mogłyby się rozjechać).
2. **Po sukcesie:** ustawia `currentCvDate` polską datą: `toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })` (np. „28.05.2026, 14:35").

### `onSave()` flow

```
1. Guard: jeśli !currentFilterValue → 'Najpierw wybierz...'
2. payload = buildProfilePayload():
     {
       exp_level_id:   currentFilterValue.expLevelIds[0] ?? '',  ← single selection
       technology_ids: currentFilterValue.technologyIds ?? []
     }
3. Walidacja: jeśli !exp_level_id → 'Wybierz poziom doświadczenia.'
4. isSaving = true, czyść timer poprzedniego sukcesu
5. await userApi.updateMyProfile(updatePayload)  ← PUT /v1/users/me/profile
6. patchProfileData(savedProfile)  ← sync z odpowiedzią backendu (single source of truth)
7. saveSuccess = 'Profil został zapisany.'
8. saveSuccessTimer = setTimeout 3000ms → saveSuccess = null
9. catch → saveError = 'Nie udało się zapisać profilu.'
10. finally → isSaving = false
```

### Uproszczony FiltersFormComponent

Na `/profile` formularz jest **mocno okrojony**. Konfiguracja w szablonie:

```html
<app-filters-form
  [initialFilters]="savedFilters"
  [singleExpLevelSelection]="true"  <!-- radio zamiast checkbox -->
  [showLocation]="false"
  [showWorkMode]="false"
  [showSalary]="false"
  [showRoles]="false"
  [showSites]="false"
  [showApplyButton]="false"
  (filtersChange)="onFiltersChange($event)">
</app-filters-form>
```

Użytkownik widzi **tylko**: seniority (jeden poziom) + technologie.

### Cykl życia

```
ngOnInit:
  guard SSR → return
  initFromToken()
  await loadUserDataFromBackend()

ngOnDestroy:
  scanTimers.forEach(clearTimeout)
  clearTimeout(saveSuccessTimer)
  destroy$.next() + complete()  ← anuluje uploadCv jeśli trwa
```

---

## ℹ️ ABOUT `/about` — strona informacyjna

**Ścieżka:** `src/features/about/`
**Route:** `/about`
**SSR mode:** `Prerender`

### Pliki

| Plik | Opis |
|---|---|
| `about.component.ts` | Pusty komponent — czysta prezentacja |
| `about.component.html` | Statyczny content (zespół, technologie, misja) |
| `about.component.css` | Layout, typografia |

### Implementacja

```typescript
@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
})
export class AboutComponent {}
```

**Brak:** logiki, API, OnInit, Signals. Wszystkie dane statyczne w HTML.

**Korzyść z Prerender:** strona generowana raz przy buildzie → idealny SEO i TTFB.

---

## 📜 LEGAL `/legal` — regulamin i FAQ

**Ścieżka:** `src/features/legal/`
**Route:** `/legal`
**SSR mode:** `Prerender`

### Pliki

| Plik | Opis |
|---|---|
| `legal.component.ts` | Logika zakładek + accordion FAQ |
| `legal.component.html` | 2 zakładki, lista kroków, lista features, accordion FAQ |
| `legal.component.css` | Layout zakładek, animacje accordion |

### Dwa stany aktywnej zakładki

```typescript
activeTab: 'how' | 'terms' = 'how';
```

### Synchronizacja z URL

```typescript
ngOnInit():
  // snapshot zamiast subskrypcji - zakładka nie zmienia się przez nawigację zewnętrzną
  const tab = this.route.snapshot.queryParamMap.get('tab');
  if (tab === 'how')   this.activeTab = 'how';
  if (tab === 'terms') this.activeTab = 'terms';

setTab(tab):
  this.activeTab = tab;
  this.router.navigate([], {
    relativeTo: this.route,
    queryParams: { tab },
    replaceUrl: true,  ← KLUCZOWE: "Wstecz" wraca do poprzedniej strony, NIE do poprzedniej zakładki
  });
```

> 💡 `replaceUrl: true` jest świadomą decyzją UX — przełączanie zakładek nie powinno zaśmiecać historii przeglądarki.

### Dane statyczne

Wszystkie dane w klasie jako `readonly` properties (nie w HTML — łatwiejsze do edycji):

```typescript
readonly steps = [
  { number: '01', icon: '🎛️', title: 'Ustaw filtry preferencji', desc: '...' },
  { number: '02', icon: '📄', title: 'Wgraj CV (wymaga konta)', desc: '...' },
  { number: '03', icon: '💼', title: 'Przeglądaj oferty', desc: '...' },
  { number: '04', icon: '🚀', title: 'Otwórz ofertę u źródła', desc: '...' },
];

readonly features = [/* 6 obiektów z icon/title/desc */];

readonly faq = [/* 6 par q/a */];
```

### FAQ accordion — wzorzec „jeden otwarty naraz"

```typescript
expandedFaq: number | null = null;

toggleFaq(index):
  this.expandedFaq = this.expandedFaq === index ? null : index;
```

Kliknięcie pytania → otwiera (lub zamyka jeśli już otwarte). Kliknięcie innego → zamyka poprzednie i otwiera nowe (klasyczny accordion behavior).

---

## 🧩 Shared: FiltersFormComponent ⭐

**Ścieżka:** `src/app/shared/filters-form/`
**Selector:** `<app-filters-form>`
**Używany przez:** Home, Offers, Profile

### Pliki

| Plik | Opis |
|---|---|
| `filters-form.component.ts` | Logika (FormGroup, forkJoin lookupy, patchValue/computeValue, salary slider) |
| `filters-form.component.html` | Sekcje formularza (collapsible, conditional via @Input flags) |
| `filters-form.component.css` | Layout sekcji, slider salary, summary header |
| `filters-form.types.ts` | Eksport typów `FiltersValue`, `FiltersInitialState`, `FILTERS_STORAGE_KEY` |

### Stałe eksportowane

```typescript
export const SALARY_OPTIONS = [
  0, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
  13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 22000,
  25000, 30000, 35000, 40000, 45000, 50000,
];
export const MAX_SALARY_INDEX = SALARY_OPTIONS.length - 1;  // 25
export const FILTERS_STORAGE_KEY = 'cv_analizer_candidate_filters';
```

> 💡 Krok nieregularny — gęstszy przy niskich kwotach (typowy rynek IT), rzadszy przy wysokich.

### Inputs (kontrola widoczności i zachowania)

| Input | Default | Opis |
|---|---|---|
| `initialFilters` | `null` | Pre-fill z URL / localStorage / state |
| `collapsible` | `false` | Czy całość można zwijać (header click) |
| `initialCollapsed` | `false` | Czy startuje zwinięty |
| `showSummaryHeader` | `false` | Header „Filtry" z licznikiem aktywnych |
| `summaryHeading` | `'Filtry'` | Tekst nagłówka |
| `showApplyButton` | `true` | Przycisk „Szukaj" |
| `applyButtonLabel` | `'Szukaj ofert'` | Tekst przycisku |
| `showProfileFillButton` | `false` | Przycisk „Uzupełnij z profilu" (tylko dla zalogowanych) |
| `profileFillButtonLabel` | `'Uzupełnij z profilu'` | Tekst przycisku |
| `profileFillButtonPosition` | `'top'` | `'top' \| 'above-technologies' \| 'header-right'` |
| `singleExpLevelSelection` | `false` | Radio zamiast checkbox dla seniority (profile) |
| `showLocation` | `true` | Sekcja lokalizacji |
| `showExpLevel` | `true` | Sekcja seniority |
| `showWorkMode` | `true` | Sekcja trybu pracy |
| `showSalary` | `true` | Slider salary |
| `showRoles` | `true` | Sekcja ról / specjalizacji |
| `showTechnologies` | `true` | Sekcja technologii (z TechPickerem) |
| `showSites` | `true` | Sekcja portali ogłoszeń |

### Outputs

| Output | Typ | Kiedy emitowany |
|---|---|---|
| `ready` | `FiltersValue` | **Raz** po pierwszej inicjalizacji (forkJoin + ustawienie stanu). Offers czeka na to przed pierwszym fetchem. |
| `filtersChange` | `FiltersValue` | Przy **każdej** zmianie formularza (debounce w nadrzędnym komponencie) |
| `applyClicked` | `FiltersValue` | Klik „Szukaj" |
| `profileFillClicked` | `void` | Klik „Uzupełnij z profilu" (nadrzędny komponent decyduje co zrobić) |

### Stan komponentu (publiczny)

| Pole | Typ | Cel |
|---|---|---|
| `filtersForm` | `FormGroup \| null` | `null` dopóki forkJoin nie zakończy |
| `isLoading` | `boolean` | Spinner dopóki lookupy się ładują |
| `loadError` | `string \| null` | Błąd forkJoin |
| `availableRoles` | `LookupItem[]` | Po forkJoin |
| `availableTechs` | `LookupItem[]` | Po forkJoin |
| `availableTechItems` | `LocationItem[]` | Te same w formacie `{id, name}` dla TechPickera |
| `availableSites` | `LookupItem[]` | Po forkJoin |
| `availableExpLevels` | `LookupItem[]` | Po forkJoin |
| `availableWorkTypes` | `LookupItem[]` | Po forkJoin |
| `availableLocations` | `LocationItem[]` | Po forkJoin, sortowane alfabetycznie |
| `selectedLocations` | `LocationItem[]` | **POZA FormGroup** — picker ma własny stan |
| `selectedTechnologies` | `LocationItem[]` | **POZA FormGroup** — picker ma własny stan |
| `collapsed` | `boolean` | Stan zwinięcia |
| `showAllRoles` | `boolean` | Toggle „Pokaż więcej ról" |
| `techPickerReady` | `boolean` | Flaga dwuetapowego renderu |

### Inicjalizacja — forkJoin równolegle

```typescript
forkJoin({
  techs:     showTechnologies ? lookupsApi.getTechnologies()    : of([]),
  specs:     showRoles        ? lookupsApi.getSpecializations() : of([]),
  locations: showLocation     ? lookupsApi.getLocations()       : of([]),
  sites:     showSites        ? lookupsApi.getSites()           : of([]),
  expLevels: showExpLevel     ? lookupsApi.getExperienceLevels(): of([]),
  workTypes: showWorkMode     ? lookupsApi.getWorkTypes()       : of([]),
}).subscribe(...)
```

`of([])` jako fallback gdy sekcja jest ukryta przez `@Input` — nie marnujemy requestu.

### Deduplikacja

`dedupeByKey(items)` — backend czasem zwraca duplikaty słowników (race condition w cache). Set-based dedup po `key`.

### Dwuetapowy render TechPickera

```typescript
this.techPickerReady = false;
this.cdr.detectChanges();          // synchroniczne ukrycie pickera
queueMicrotask(() => {
  this.techPickerReady = true;
  this.cdr.detectChanges();        // pokaż picker z gotowym selectedTechnologies
  this.ready.emit(initial);
  this.filtersChange.emit(initial);
});
```

> ⚠️ **Anti-flicker pattern.** Bez tego TechPicker renderuje się zanim `selectedTechnologies` jest ustawione, co powoduje miganie pustego stanu na ułamek sekundy.

### Restore stanu z `initialFilters`

**Priorytety dla lokalizacji:**
```
selectedLocations (pełne obiekty)  >  locationIds (tablica ID do wyszukania w availableLocations)
```

**Priorytety dla technologii:**
```
selectedTechnologies (pełne obiekty)  >  technologies (stary Record<id, boolean>)
```

Backward-compat: stare zapisy w localStorage używają `Record<string, boolean>`, nowe przekazują `LocationItem[]`.

### Słowniki — wszystkie publiczne dla zewnętrznego użycia

`OffersComponent` używa `filtersFormRef.availableSites`, `.availableWorkTypes`, `.availableRoles` itp. do formatowania kluczy na czytelne nazwy (`formatSource`, `getWorkModeLabel`). To dlatego słowniki są w polach **publicznych**.

### Cykl życia

```
ngOnInit:
  collapsed = collapsible && initialCollapsed
  forkJoin(wszystkie lookupy) → buildForm() → subscribeFormChanges() → techPickerReady + ready + filtersChange

ngOnChanges:
  jeśli initialFilters się zmieniło → patchValue(nowyStan)

ngOnDestroy:
  destroy$.next() + complete()
```

---

## 🧭 Shared: NavbarComponent

**Ścieżka:** `src/app/shared/navbar/`
**Selector:** `<app-navbar>`

### Pliki

| Plik | Opis |
|---|---|
| `navbar.component.ts` | Gettery isAuthenticated / username z AuthService, login/logout |
| `navbar.component.html` | Logo + linki (/, /offers, /about, /legal) + warunkowy login/logout |
| `navbar.component.css` | Sticky header, glassmorphism |

### Implementacja

```typescript
export class NavbarComponent {
  constructor(private readonly authService: AuthService) {}

  get isAuthenticated() { return this.authService.isAuthenticated; }
  get username()        { return this.authService.username; }

  async login():  Promise<void> { await this.authService.login(); }
  async logout(): Promise<void> { await this.authService.logout(); }
}
```

> 💡 Gettery (a nie pola) bo `authService.isAuthenticated` to **Signal** (funkcja). W szablonie: `*ngIf="isAuthenticated()"` — wywołanie funkcji.

### Brak własnego stanu

Cały stan pochodzi z `AuthService` (Signals). Komponent jest reaktywny — gdy `isAuthenticated` zmienia wartość, Angular odświeża widok automatycznie (signal-based change detection).

---

## 🦶 Shared: FooterComponent

**Ścieżka:** `src/app/shared/footer/`
**Selector:** `<app-footer>`

### Pliki

| Plik | Opis |
|---|---|
| `footer.component.ts` | Pusty (`RouterModule` dla `routerLink`) |
| `footer.component.html` | Linki do `/legal`, `/about`, copyright, nazwa projektu |
| `footer.component.css` | Layout grid stopki |

### Implementacja

```typescript
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
})
export class FooterComponent {}
```

Klasa pusta. Cała wartość w HTML/CSS.

---

## 🧠 Shared: TechPickerComponent

**Ścieżka:** `src/app/shared/tech-picker/tech-picker.component.ts` (inline template/styles)
**Selector:** `<app-tech-picker>`

Multi-select z autocomplete dla **technologii**. Inline template + inline styles (mały komponent, łatwiej utrzymać w jednym pliku).

### Inputs

| Input | Typ | Opis |
|---|---|---|
| `technologies` | `LocationItem[]` | Lista dostępnych technologii (z LookupsApi) |
| `selected` | `LocationItem[]` | Aktualnie wybrane (kontrolowane z zewnątrz) |
| `placeholderEmpty` | `string?` | Placeholder gdy `selected.length === 0` |
| `placeholderMore` | `string?` | Placeholder gdy są już wybrane |

### Outputs

| Output | Typ | Opis |
|---|---|---|
| `selectedChange` | `LocationItem[]` | Emit przy każdej zmianie wyboru |

### UI elements

- **Field** (`.tp-field`): chevron + tagi wybranych (z `×`) + input do wpisywania
- **Badge** (`.tp-badge`): liczba wybranych
- **Clear button** (`.tp-clear`): czyści cały wybór
- **Dropdown** (`.tp-dropdown`): header z licznikiem + lista opcji z `[innerHTML]="highlight(item.name)"` (podświetlanie matchu)

### Behavior

- **Autocomplete** filtruje `technologies` po `query` (substring match, case-insensitive)
- **Click outside** zamyka dropdown (`@HostListener`)
- **Escape** zamyka dropdown
- **Tab navigation** kompatybilna (button + input)

### Highlighting

`highlight(name)` używa `highlightMatch(name, query, '#6366f1')` z `shared/highlight.ts` — zwraca HTML z `<strong style="color:#6366f1">` wokół trafienia, **escape'owany** przed XSS.

---

## 📍 Shared: LocationPickerComponent

**Ścieżka:** `src/app/shared/location-picker/location-picker.component.ts` (inline template/styles)
**Selector:** `<app-location-picker>`

Multi-select z autocomplete dla **miast/lokalizacji**. Bardzo podobny do TechPickera — wręcz dzieli z nim interfejs `LocationItem`.

### Eksportowany interfejs

```typescript
export interface LocationItem {
  id: string;
  name: string;
}
```

> 💡 `LocationItem` jest używany **WSZĘDZIE** — w FiltersFormComponent, TechPickerComponent, FiltersInitialState/FiltersValue, w home/offers/profile. To główny typ słowników w aplikacji.

### Inputs

| Input | Typ | Opis |
|---|---|---|
| `locations` | `LocationItem[]` | Lista dostępnych miast |
| `selected` | `LocationItem[]` | Aktualnie wybrane |

### Outputs

| Output | Typ | Opis |
|---|---|---|
| `selectedChange` | `LocationItem[]` | Emit przy każdej zmianie |

### UI elements

- **Field** (`.lp-field`): ikona pinezki + tagi (z `×`) + input
- **Dropdown** (`.lp-dropdown`): lista opcji z highlight + komunikat „Brak wyników"
- **Clear button** (`.lp-clear`): czyści cały wybór

### Behavior

- **mousedown na opcji** (nie click!) — bo `blur` na input odpaliłby się przed `click` i zamknął dropdown. `mousedown` jest przed `blur`.
- **focus/blur** sterują `showDropdown` z drobnym opóźnieniem (`setTimeout 0`) żeby kliknięcie opcji zdążyło się zarejestrować.

### Highlighting

Tak jak TechPicker — `highlightMatch(name, query, '#6366f1')`.

> ⚠️ Praca zdalna jest **osobnym checkboxem** w FiltersFormComponent (`workMode.remote`), nie lokalizacją. Lista lokalizacji to fizyczne miasta.

---

## ✨ Shared: highlight.ts

**Ścieżka:** `src/app/shared/highlight.ts`

Helper do bezpiecznego podświetlania fragmentów tekstu pasujących do query (autocomplete dropdowns).

### API

```typescript
export function highlightMatch(name: string, query: string, color: string): string;
```

### Implementacja

```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function highlightMatch(name, query, color) {
  const q = query.trim();
  if (!q) return escapeHtml(name);
  const idx = name.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return escapeHtml(name);
  return (
    escapeHtml(name.slice(0, idx)) +
    `<strong style="color:${color};font-weight:700">${escapeHtml(name.slice(idx, idx + q.length))}</strong>` +
    escapeHtml(name.slice(idx + q.length))
  );
}
```

### Bezpieczeństwo

> 🛡️ **XSS-safe.** `escapeHtml()` konwertuje wszystkie sekcje surowego tekstu przed wstawieniem do `<strong>`. Wynik jest wstrzykiwany przez `[innerHTML]` co normalnie byłoby niebezpieczne — dlatego escape jest **obowiązkowy**.

Co jest escapowane:
- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`

Apostrofu (`'`) nie escape'ujemy bo nie używamy go w atrybutach inline z single quotes. Color przekazywany jako parametr `color: string` jest **kontrolowany przez kod** (hardcoded `'#6366f1'`), nie pochodzi od użytkownika.

---

## 📚 Powiązane dokumenty

- [`README.md`](../README.md) — quick-start
- [`docs/architecture.md`](architecture.md) — wzorce Angular (standalone, Signals, OnPush)
- [`docs/api-services.md`](api-services.md) — serwisy API używane przez features
- [`docs/auth-flow.md`](auth-flow.md) — Keycloak flow + authGuard chroniący `/profile`
