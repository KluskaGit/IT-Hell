# ✨ Features — IT-Hell Frontend

Detailed documentation of all pages (`features/`) and shared components (`shared/`). Each subsection covers: files, component state, key methods, the user flow and implementation gotchas.

Complements the [main README](../README.md) and [`docs/architecture.md`](architecture.md).

## 📑 Table of contents

- [Features map](#-features-map)
- [HOME `/` — home page](#-home--home-page)
- [OFFERS `/offers` — offer list](#-offers-offers--offer-list)
- [PROFILE `/profile` — user profile](#-profile-profile--user-profile)
- [ABOUT `/about` — info page](#-about-about--info-page)
- [LEGAL `/legal` — terms and FAQ](#-legal-legal--terms-and-faq)
- [Shared: FiltersFormComponent](#-shared-filtersformcomponent-)
- [Shared: NavbarComponent](#-shared-navbarcomponent)
- [Shared: FooterComponent](#-shared-footercomponent)
- [Shared: TechPickerComponent](#-shared-techpickercomponent)
- [Shared: LocationPickerComponent](#-shared-locationpickercomponent)
- [Shared: highlight.ts](#-shared-highlightts)

---

## 🗺️ Features map

| Page | Route | SSR mode¹ | Auth | Main job |
|---|---|---|---|---|
| Home | `/` | Prerender | — | Drop CV + analysis + navigate to offers |
| Offers | `/offers` | **Client** | — | Offer list with filters + infinite scroll + resizable sidebar |
| Profile | `/profile` | Prerender | ✅ `authGuard` | Edit data + save CV + preferences to the DB |
| About | `/about` | Prerender | — | Static project presentation |
| Legal | `/legal` | Prerender | — | Terms, FAQ, usage guide (2 tabs) |

> ¹ "SSR mode" is the `RenderMode` configured in `app.routes.server.ts`. **SSR is not currently wired into the build** (`angular.json` only defines `browser`), so the app ships as a client-only SPA and these modes are dormant — see [architecture.md](architecture.md).

| Shared | File | Purpose |
|---|---|---|
| FiltersFormComponent | `app/shared/filters-form/` | Reusable filter form (home/offers/profile) |
| NavbarComponent | `app/shared/navbar/` | Top bar with login/logout |
| FooterComponent | `app/shared/footer/` | Footer with links |
| TechPickerComponent | `app/shared/tech-picker/` | Technology multi-select with autocomplete |
| LocationPickerComponent | `app/shared/location-picker/` | City multi-select with autocomplete |
| highlight.ts | `app/shared/highlight.ts` | Helper for safe `<strong>` highlighting (XSS-safe) |

---

## 🏠 HOME — home page

<div align="center">
  <img src="images/cv-analysis.png" alt="CV analysis on the home page" width="800">
</div>

**Path:** `src/features/home/`
**Route:** `/`

### Files

| File | Description |
|---|---|
| `home.component.ts` | CV dropzone logic, scanning animation, fillFromProfile, FiltersFormComponent integration |
| `home.component.html` | Hero + dropzone + scan animation + filter form + 3 feature cards |
| `home.component.css` | Light cards, gradients, static glow blobs in the background |

### Module constants

```typescript
const MAX_CV_SIZE_MB = 10;
const MAX_CV_SIZE_BYTES = MAX_CV_SIZE_MB * 1024 * 1024;
```

The 10 MB limit is a compromise: most PDF/DOC CVs fit, while larger files slow down the backend.

### Component state

| Field | Type | Purpose |
|---|---|---|
| `selectedFile` | `File \| null` | The uploaded CV after validation |
| `uploadError` | `string \| null` | Validation error (wrong format / too large) |
| `isDragging` | `boolean` | Whether the user is currently dragging a file over the dropzone |
| `isScanning` | `boolean` | Whether the upload + animation is in progress (true from POST until the animation ends) |
| `scanProgress` | `number` | 0–100, drives the progress bar |
| `scanStatus` | `string` | Text above the bar: "Analiza CV..." → "Zakończono!" |
| `scanComplete` | `boolean` | Whether to show the success banner |
| `isFillingFromProfile` | `boolean` | Blocks repeated clicks on "Fill from profile" |
| `fillProfileError` | `string \| null` | fillFromProfile error |
| `savedFilters` | `FiltersInitialState \| null` | State passed to `<app-filters-form [initialFilters]>` |

### Key methods

#### `handleFile(file: File)` — validation before upload

```
1. Checks the extension (.pdf / .doc / .docx, case-insensitive)
2. Checks the size (≤ 10 MB)
3. If OK → uploadError = null, selectedFile = file, analyzeCV(file)
4. If error → uploadError = a Polish message, return
```

#### `analyzeCV(file: File)` — upload + fake progress animation

```
1. isScanning = true, scanProgress = 0, scanStatus = 'Analiza CV...'
2. setTimeout 200ms → scanProgress = 35 (signal that something is happening)
3. cvApi.uploadCv(file).subscribe({
     next: (techs) => {
       scanProgress = 100, scanStatus = 'Zakończono!'
       setTimeout 150ms → switch to the banner, patchValue selectedTechnologies, autoFillForm()
     },
     error: () => {
       scanProgress = 100, scanStatus = 'Nie udało się...'
       setTimeout 150ms → reset (isScanning=false, selectedFile=null)
     }
   })
```

> ⚠️ The backend doesn't return real-time progress — the animation is **fake**. The jump to 35% is pure UX (the user sees something happening), the 150ms delay after the response gives time to see "100% Zakończono!".

All timers are pushed to `scanTimers[]` and cleared in `ngOnDestroy` — without that a timer callback could run after the component is destroyed.

#### `fillFromProfile()` — fetch preferences from the backend

```
1. Guard: isPlatformBrowser + isAuthenticated() (Keycloak)
2. isFillingFromProfile = true
3. await userApi.getMyProfile() (GET /v1/users/me/profile)
4. Map technologies: { id, name } (the LocationItem format)
5. expLevelId = profile.exp_level?.id ?? ''
6. Spread the current filters (filtersFormRef.computeValue())
   + override: selectedTechnologies, technologies (Record), seniority (Record)
7. patchValue on FiltersFormComponent
8. autoFillForm() (save to localStorage)
9. cdr.markForCheck() (because this is an async callback)
```

> 💡 The `...computeValue()` spread keeps the filters the user already set manually (location, salary) and overrides only seniority and technologies from the profile.

#### `onSubmit(value: FiltersValue)` — clicking "Search"

```typescript
saveFilters(value);  // save to localStorage under FILTERS_STORAGE_KEY
router.navigate(['/offers'], {
  state: { filters: value, cvFileName: this.selectedFile?.name ?? null }
});
```

Filters are passed via **`history.state`** — `OffersComponent.ngOnInit()` reads them as one of its sources (priority: URL > history.state > localStorage > `{}`).

### Drag & Drop API

| Handler | What it does |
|---|---|
| `onDragOver(e)` | `e.preventDefault()` (without it `drop` is ignored), `isDragging = true` |
| `onDragLeave(e)` | `e.preventDefault()`, `isDragging = false` |
| `onDrop(e)` | `e.preventDefault()`, take `dataTransfer.files[0]`, `handleFile(file)` |
| `onFileSelected(e)` | Handler for the hidden `<input type="file">` triggered by clicking the dropzone |

### Integration with FiltersFormComponent

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

`@ViewChild(FiltersFormComponent) filtersFormRef` gives access to:
- `filtersFormRef.computeValue()` — read the current state
- `filtersFormRef.patchValue({ selectedTechnologies })` — programmatic update after CV analysis

### Lifecycle

```
ngOnInit:
  SSR guard → return
  router.events.subscribe(takeUntil) → markForCheck() on every navigation

ngOnDestroy:
  scanTimers.forEach(clearTimeout)
  destroy$.next() + complete()
```

### UI highlights

- **Hero** with `text-gradient` (background-clip: text, indigo → violet)
- **2 background glow blobs** — static radial gradients (no animation; the animated variant is on `/profile`)
- **Dropzone with a radar animation** during scanning (`radar-sweep`, the `radar-done` class stops it at 100%)
- **3 feature cards** in the marketing section (Smart Scraper / CV analysis / your filters)

---

## 💼 OFFERS `/offers` — offer list

<div align="center">
  <img src="images/offers-list.png" alt="Offer list with the filter sidebar" width="800">
  <p><sub>Full view: filter sidebar on the left, offer list on the right, top bar with the search</sub></p>
</div>

**Path:** `src/features/offers/`
**Route:** `/offers`
**SSR mode:** `Client` ⚠️ (needs `IntersectionObserver`, `localStorage`, `history.state`)

### Files

| File | Description |
|---|---|
| `offers.component.ts` | Filters + pagination + infinite scroll + resizable sidebar (~628 lines) |
| `offers.component.html` | Filter sidebar (resize handle) + offer list (`#mainScroll` + `#scrollSentinel`) |
| `offers.component.css` | Responsive grid, drag handle, card glassmorphism, sticky top bar |

### Module constants

```typescript
const MAX_SALARY = 50000;  // synced with SALARY_OPTIONS in FiltersFormComponent
```

### ViewModel interface

```typescript
interface OfferViewModel extends MappedOffer {
  matchedTech: string[];   // offer technology IDs matching the filters (for the badge)
  matchedRoles: string[];  // offer role IDs matching the filters
}
```

### Component state

| Field | Type | Purpose |
|---|---|---|
| `initialFilters` | `FiltersInitialState \| null` | State passed to FiltersFormComponent on the first render |
| `currentFilters` | `FiltersValue \| null` | Full filter state after every change |
| `allOffers` | `MappedOffer[]` | All fetched offers (accumulated during infinite scroll) |
| `matchedOffers` | `OfferViewModel[]` | Client-side filtered + enriched with matched data |
| `searchQuery` | `string` | Text in the title search |
| `searchFocused` | `boolean` | Styling of the active search field |
| `isLoading` | `boolean` | Main list spinner (first page) |
| `isLoadingMore` | `boolean` | Small spinner below the list (next pages) |
| `loadError` | `string \| null` | Polish API error message |
| `currentPage` | `number` | Index of the loaded page (0 = first) |
| `hasMore` | `boolean` | false when the last response < pageSize |
| `pageSize` | `readonly 20` | Pagination size (skip/limit) |
| `isFiltersVisible` | `boolean` | Sidebar toggle |
| `sidebarWidth` | `number` | Current width in px (clamp 240–480) |
| `isSidebarDragging` | `boolean` | Whether the handle is being dragged |

### Resizable sidebar — details

**Constants:**
```typescript
SIDEBAR_KEY     = 'cv_offers_sidebar_width';
SIDEBAR_MIN     = 240;
SIDEBAR_MAX     = 480;
SIDEBAR_DEFAULT = 340;
```

**Drag mechanism (mouse-based):**

```
onDragStart(event):
  preventDefault()  // block text selection
  isSidebarDragging = true
  dragStartX = event.clientX
  dragStartWidth = sidebarWidth
  document.addEventListener('mousemove', boundMove)   // global! so it works outside the handle
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

> ⚠️ **Critical gotcha:** `boundMove` and `boundEnd` are **stable references** created in class fields via `.bind(this)`. Without them `removeEventListener` couldn't find the listener (each `.bind()` creates a new function reference).

`loadSidebarWidth()` in `ngOnInit` reads the saved value and clamps it to MIN-MAX (in case the constants changed since the previous visit).

### Infinite scroll — IntersectionObserver

The `@ViewChild('scrollSentinel')` setter is called by Angular **dynamically** (the sentinel appears and disappears from the DOM):

```typescript
set scrollSentinel(el) {
  if (el?.nativeElement === this.sentinelEl) return;  // no change - skip
  this.intersectionObserver?.disconnect();             // disconnect the previous one
  this.sentinelEl = el?.nativeElement;
  if (this.sentinelEl && isPlatformBrowser(this.platformId)) {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) this.loadMore(); },
      {
        root: this.mainScrollRef?.nativeElement ?? null,
        rootMargin: '200px',  // load 200px before reaching the end
        threshold: 0,
      }
    );
    this.intersectionObserver.observe(this.sentinelEl);
  }
}
```

`rootMargin: '200px'` — the observer reacts when the sentinel is 200px before entering the viewport, eliminating a pause while scrolling.

### Filter sources — priorities

In `ngOnInit`, the `route.queryParamMap` subscription:

```
1. URL query params (?roles=...&tech=...)   ← highest priority (shareable links)
2. history.state.filters                     ← passed from home via router.navigate
3. localStorage (FILTERS_STORAGE_KEY)        ← last saved filters
4. {} (empty)                                ← first visit
```

Checked once: `if (this.initialFilters) return;` guards against later emissions (e.g. after `updateUrl()`).

### URL sync — short keys

`buildQueryParams(value)` uses short aliases (the URL must stay readable):

| Full name | URL alias |
|---|---|
| `specializationIds` | `roles` |
| `expLevelIds` | `seniority` |
| `workTypeIds` | `wm` |
| `siteIds` | `sites` |
| `locationIds` | `loc` |
| `technologyIds` | `tech` |
| `salaryFromIndex` | `salFrom` |
| `salaryToIndex` | `salTo` |

`null` means "remove this param from the URL" when the filter isn't active.

`urlToFilters(params)` — the inverse. `getIds(key)` handles both formats: `?tech=a&tech=b` AND `?tech=a,b` (comma split).

### Debouncing

Two separate Subjects with different delays:

```typescript
filtersTrigger$.pipe(skip(1), debounceTime(700)).subscribe(value => {
  updateUrl(value);
  resetAndLoad(value);
});

searchTrigger$.pipe(debounceTime(500)).subscribe(() => {
  if (this.currentFilters) this.resetAndLoad(this.currentFilters);
});
```

- **Filters: 700 ms** — the user clicks several checkboxes in a row
- **Search: 500 ms** — shorter because search should react faster
- **`skip(1)`** — skips the first emission, because the first load is triggered by `onFiltersReady()` (without it: a double load on startup)

### Client-side filtering: salary

`computeMatchedOffers()` filters locally only by salary range:

```typescript
isSalaryInRange(offer, filters):
  if (offer.salaryMin === 0 && offer.salaryMax === 0) return true;  // no range = OK
  return offer.salaryMax >= filters.salaryFrom && offer.salaryMin <= filters.salaryTo;
```

> 💡 Offers with no stated range **always pass** — hiding them would be bad UX because the employer simply didn't disclose the range.

### Sorting

```typescript
sortBatch(offers):
  offers with a salary → descending by salaryMax
  offers without a salary → last, alphabetically by title (locale 'pl')
```

### Enriching offers with `matchedTech`/`matchedRoles`

```typescript
toOfferViewModel(offer, filters):
  selectedRoles = keys from filters.itArea where the value is true
  selectedTech  = keys from filters.technologies where the value is true
  matchedRoles  = offer.roles.filter(r => selectedRoles.includes(r))
  matchedTech   = offer.technologies.filter(t => selectedTech.includes(t))
  return { ...offer, matchedRoles, matchedTech }
```

In the template, technology tags get the `tag--match` class when `offer.matchedTech.includes(tech)` — visually highlighted (border + glow).

<div align="center">
  <img src="images/offer-card-matched.png" alt="Offer card with highlighted matches" width="600">
  <p><sub>Close-up of an offer card — technologies selected in the filters get the <code>tag--match</code> class (colored border)</sub></p>
</div>

### Card footer — dates and button

Each offer card has a footer with two elements:

- **Dates (left):** `publication_date` shown as "Dodano: DD.MM.YYYY", `expiration_date` as "Wygasa: DD.MM.YYYY" (class `offer-card__date--expiry`). Shown only when the backend returned a value (`*ngIf`). Formatted with the Angular pipe `date:'dd.MM.yyyy'`.
- **"Otwórz ofertę" button (right):** `[disabled]` when `offer.url` is empty.

### Opening external offers

```typescript
openOffer(offer):
  if (offer.url && isPlatformBrowser) {
    window.open(offer.url, '_blank', 'noopener,noreferrer');
  }
```

- `noopener` — the new tab has no access to `window.opener`
- `noreferrer` — doesn't send the `Referer` header to the external site

### Delegated formatters

`formatRole(key)`, `formatTech(key)`, `formatSource(key)`, `getWorkModeLabel(id)` delegate to `filtersFormRef` because that's **where the backend lookups are loaded**. Fallback: returns the raw key.

### TrackBy in `*ngFor`

```typescript
trackOffer(_, offer) → offer.id
trackByString(_, value) → value
```

Without `trackBy` Angular destroys and recreates all list elements on every change — very inefficient with 20+ cards with animations.

### Lifecycle

```
ngOnInit:
  SSR guard → return
  loadSidebarWidth()
  router.events → markForCheck (on navigation)
  filtersTrigger$ → skip(1) + debounce 700ms → updateUrl + resetAndLoad
  searchTrigger$ → debounce 500ms → resetAndLoad
  route.queryParamMap → determine the filter source

ngOnDestroy:
  destroy$.next() + complete()
  intersectionObserver?.disconnect()
  document.removeEventListener('mousemove', boundMove)
  document.removeEventListener('mouseup',   boundEnd)
```

---

## 👤 PROFILE `/profile` — user profile

<div align="center">
  <img src="images/profile-view.png" alt="User profile page" width="800">
  <p><sub>Data from the JWT (read-only) + CV dropzone + simplified filters (seniority radio + technologies)</sub></p>
</div>

**Path:** `src/features/profile/`
**Route:** `/profile` (protected by `authGuard`)

### Files

| File | Description |
|---|---|
| `profile.component.ts` | 2-stage load, CV upload, save flow to `/v1/users/me/profile` |
| `profile.component.html` | JWT data + drag-drop CV + simplified FiltersFormComponent |
| `profile.component.css` | Single-column layout, card sections, glassmorphism |

### Component state

| Field | Type | Purpose |
|---|---|---|
| `email`, `firstName`, `lastName` | `string` | Data from the JWT/backend (read-only in the UI) |
| `currentCvFile` | `string \| null` | Uploaded CV file name |
| `currentCvDate` | `string` | Upload date (pl-PL format) |
| `isDragging`, `isScanning`, `scanProgress`, `scanStatus`, `scanComplete` | — | Same as on home |
| `savedFilters` | `FiltersInitialState \| null` | State for FiltersFormComponent |
| `currentFilterValue` | `FiltersValue \| null` | Updated via (filtersChange), used on save |
| `isSaving` | `boolean` | Disables the Save button |
| `loadError`, `saveError`, `saveSuccess` | `string \| null` | UI messages |

### Two-stage load

```
ngOnInit:
  isPlatformBrowser guard
  initFromToken()                ← synchronously from the JWT
  await loadUserDataFromBackend()  ← async from the API
```

**`initFromToken()`:**
```typescript
const profile = this.authService.getProfile();  // reads tokenParsed
this.email     = profile.email;
this.firstName = profile.firstName ?? '';
this.lastName  = profile.lastName  ?? '';
```

> 💡 First name and email are available **immediately** from the JWT — we don't wait for the backend for the basic fields. This shortens the time to a first meaningful view.

**`loadUserDataFromBackend()`:**
```
try:
  me = await userApi.getMe()                  ← GET /v1/users/me
  patchUserData(me)                            ← override the token data
  try:
    profile = await userApi.getMyProfile()    ← GET /v1/users/me/profile
    patchProfileData(profile)
  catch (err):
    if err.status === 404:
      savedFilters = { selectedTechnologies: [], technologies: {}, seniority: {} }
      return    ← 404 is expected for new users
    throw err   ← propagate other errors
catch (err):
  loadError = 'Nie udało się pobrać danych profilu z backendu.'
```

> ⚠️ **404 is NOT an error** — a new user never saved a profile. The inner try/catch handles it gracefully.

### CV upload flow

The same mechanism as on home (`handleFile` + `analyzeCV`), with two differences:

1. **On success:** it syncs `currentFilterValue` with the new technologies so `onSave()` has up-to-date data (without it the form state and `currentFilterValue` could drift apart).
2. **On success:** it sets `currentCvDate` to a Polish date: `toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })` (e.g. "28.05.2026, 14:35").

### `onSave()` flow

```
1. Guard: if !currentFilterValue → 'Najpierw wybierz...'
2. payload = buildProfilePayload():
     {
       exp_level_id:   currentFilterValue.expLevelIds[0] ?? '',  ← single selection
       technology_ids: currentFilterValue.technologyIds ?? []
     }
3. Validation: if !exp_level_id → 'Wybierz poziom doświadczenia.'
4. isSaving = true, clear the previous success timer
5. await userApi.updateMyProfile(updatePayload)  ← PUT /v1/users/me/profile
6. patchProfileData(savedProfile)  ← sync with the backend response (single source of truth)
7. saveSuccess = 'Profil został zapisany.'
8. saveSuccessTimer = setTimeout 3000ms → saveSuccess = null
9. catch → saveError = 'Nie udało się zapisać profilu.'
10. finally → isSaving = false
```

### Simplified FiltersFormComponent

On `/profile` the form is **heavily trimmed**. Config in the template:

```html
<app-filters-form
  [initialFilters]="savedFilters"
  [showApplyButton]="false"
  summaryHeading="Technologie i doświadczenie"
  [showSummaryHeader]="true"
  [showLocation]="false"
  [showWorkMode]="false"
  [showSalary]="false"
  [showRoles]="false"
  [showSites]="false"
  [showExpLevel]="true"
  [showTechnologies]="true"
  [singleExpLevelSelection]="true"  <!-- radio instead of checkbox -->
  (filtersChange)="onFiltersChange($event)">
</app-filters-form>
```

The user sees **only**: seniority (one level) + technologies.

### Lifecycle

```
ngOnInit:
  SSR guard → return
  initFromToken()
  await loadUserDataFromBackend()

ngOnDestroy:
  scanTimers.forEach(clearTimeout)
  clearTimeout(saveSuccessTimer)
  destroy$.next() + complete()  ← cancels uploadCv if in progress
```

---

## ℹ️ ABOUT `/about` — info page

**Path:** `src/features/about/`
**Route:** `/about`

### Files

| File | Description |
|---|---|
| `about.component.ts` | Empty component — pure presentation |
| `about.component.html` | Static content (team, navigation cards) |
| `about.component.css` | Layout, typography |

### Implementation

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

**No:** logic, API, OnInit, Signals. All data is static in the HTML.

---

## 📜 LEGAL `/legal` — terms and FAQ

**Path:** `src/features/legal/`
**Route:** `/legal`

### Files

| File | Description |
|---|---|
| `legal.component.ts` | Tab logic + FAQ accordion |
| `legal.component.html` | 2 tabs, step list, feature list, FAQ accordion |
| `legal.component.css` | Tab layout, accordion animations |

### Two active-tab states

```typescript
activeTab: 'how' | 'terms' = 'how';
```

### URL sync

```typescript
ngOnInit():
  // snapshot instead of a subscription - the tab doesn't change through external navigation
  const tab = this.route.snapshot.queryParamMap.get('tab');
  if (tab === 'how')   this.activeTab = 'how';
  if (tab === 'terms') this.activeTab = 'terms';

setTab(tab):
  this.activeTab = tab;
  this.router.navigate([], {
    relativeTo: this.route,
    queryParams: { tab },
    replaceUrl: true,  ← KEY: "Back" returns to the previous page, NOT the previous tab
  });
```

> 💡 `replaceUrl: true` is a deliberate UX decision — switching tabs shouldn't clutter the browser history.

### Static data

All data lives in the class as `readonly` properties (not in HTML — easier to edit):

```typescript
readonly steps = [
  { number: '01', icon: '🎛️', title: 'Ustaw filtry preferencji', desc: '...' },
  { number: '02', icon: '📄', title: 'Wgraj CV (wymaga konta)', desc: '...' },
  { number: '03', icon: '💼', title: 'Przeglądaj oferty', desc: '...' },
  { number: '04', icon: '🚀', title: 'Otwórz ofertę u źródła', desc: '...' },
];

readonly features = [/* 6 objects with icon/title/desc */];

readonly faq = [/* 6 q/a pairs */];
```

### FAQ accordion — "one open at a time" pattern

```typescript
expandedFaq: number | null = null;

toggleFaq(index):
  this.expandedFaq = this.expandedFaq === index ? null : index;
```

Clicking a question → opens it (or closes it if already open). Clicking another → closes the previous and opens the new (classic accordion behavior).

---

## 🧩 Shared: FiltersFormComponent ⭐

**Path:** `src/app/shared/filters-form/`
**Selector:** `<app-filters-form>`
**Used by:** Home, Offers, Profile

### Files

| File | Description |
|---|---|
| `filters-form.component.ts` | Logic (FormGroup, forkJoin lookups, patchValue/computeValue, salary slider) |
| `filters-form.component.html` | Form sections (conditional via @Input flags) |
| `filters-form.component.css` | Section layout, salary slider, summary header |
| `filters-form.types.ts` | Exports `FiltersValue`, `FiltersInitialState`, `FILTERS_STORAGE_KEY` |

### Exported constants

```typescript
export const SALARY_OPTIONS = [
  0, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
  13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 22000,
  25000, 30000, 35000, 40000, 45000, 50000,
];
export const MAX_SALARY_INDEX = SALARY_OPTIONS.length - 1;  // 25
export const FILTERS_STORAGE_KEY = 'cv_analizer_candidate_filters';
```

> 💡 An irregular step — denser at lower amounts (typical for the IT market), sparser at higher ones.

### Inputs (visibility and behavior control)

| Input | Default | Description |
|---|---|---|
| `initialFilters` | `null` | Pre-fill from URL / localStorage / state |
| `collapsible` | `false` | Whether the whole form can collapse (header click) |
| `initialCollapsed` | `false` | Whether it starts collapsed |
| `showSummaryHeader` | `false` | "Filtry" header |
| `summaryHeading` | `'Filtry'` | Header text |
| `showApplyButton` | `true` | "Search" button |
| `applyButtonLabel` | `'Szukaj ofert'` | Button text |
| `showProfileFillButton` | `false` | "Fill from profile" button (logged-in users only) |
| `profileFillButtonLabel` | `'Uzupełnij z profilu'` | Button text |
| `profileFillButtonPosition` | `'top'` | `'top' \| 'above-technologies' \| 'header-right'` |
| `singleExpLevelSelection` | `false` | Radio instead of checkbox for seniority (profile) |
| `showLocation` | `true` | Location section |
| `showExpLevel` | `true` | Seniority section |
| `showWorkMode` | `true` | Work mode section |
| `showSalary` | `true` | Salary slider |
| `showRoles` | `true` | Roles / specializations section |
| `showTechnologies` | `true` | Technologies section (with TechPicker) |
| `showSites` | `true` | Job boards section |

### Outputs

| Output | Type | Emitted when |
|---|---|---|
| `ready` | `FiltersValue` | **Once** after the first initialization (forkJoin + state set). Offers waits for it before the first fetch. |
| `filtersChange` | `FiltersValue` | On **every** form change (debounced in the parent component) |
| `applyClicked` | `FiltersValue` | "Search" click |
| `profileFillClicked` | `void` | "Fill from profile" click (the parent decides what to do) |

### Component state (public)

| Field | Type | Purpose |
|---|---|---|
| `filtersForm` | `FormGroup \| null` | `null` until forkJoin finishes |
| `isLoading` | `boolean` | Spinner while the lookups load |
| `loadError` | `string \| null` | forkJoin error |
| `availableRoles` | `LookupItem[]` | After forkJoin |
| `availableTechs` | `LookupItem[]` | After forkJoin |
| `availableTechItems` | `LocationItem[]` | The same in `{id, name}` format for the TechPicker |
| `availableSites` | `LookupItem[]` | After forkJoin |
| `availableExpLevels` | `LookupItem[]` | After forkJoin |
| `availableWorkTypes` | `LookupItem[]` | After forkJoin |
| `availableLocations` | `LocationItem[]` | After forkJoin, sorted alphabetically |
| `selectedLocations` | `LocationItem[]` | **OUTSIDE the FormGroup** — the picker has its own state |
| `selectedTechnologies` | `LocationItem[]` | **OUTSIDE the FormGroup** — the picker has its own state |
| `collapsed` | `boolean` | Collapse state |
| `showAllRoles` | `boolean` | "Show more roles" toggle |
| `techPickerReady` | `boolean` | Two-step render flag |

### Initialization — forkJoin in parallel

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

`of([])` as a fallback when a section is hidden via `@Input` — we don't waste a request.

### Deduplication

`dedupeByKey(items)` — the backend sometimes returns duplicate lookups. Set-based dedup by `key`.

### Two-step TechPicker render

```typescript
this.techPickerReady = false;
this.cdr.detectChanges();          // synchronously hide the picker
queueMicrotask(() => {
  this.techPickerReady = true;
  this.cdr.detectChanges();        // show the picker with selectedTechnologies ready
  this.ready.emit(initial);
  this.filtersChange.emit(initial);
});
```

> ⚠️ **Anti-flicker pattern.** Without it the TechPicker renders before `selectedTechnologies` is set, causing a flash of empty state for a split second.

### Restoring state from `initialFilters`

**Location priority:**
```
selectedLocations (full objects)  >  locationIds (array of IDs to look up in availableLocations)
```

**Technology priority:**
```
selectedTechnologies (full objects)  >  technologies (old Record<id, boolean>)
```

Backward-compat: old localStorage entries use `Record<string, boolean>`, new ones pass `LocationItem[]`.

### Lookups — all public for external use

`OffersComponent` uses `filtersFormRef.availableSites`, `.availableWorkTypes`, `.availableRoles`, etc. to format keys into readable names (`formatSource`, `getWorkModeLabel`). That's why the lookups are in **public** fields.

### Lifecycle

```
ngOnInit:
  collapsed = collapsible && initialCollapsed
  forkJoin(all lookups) → buildForm() → subscribeFormChanges() → techPickerReady + ready + filtersChange

ngOnChanges:
  if initialFilters changed → patchValue(newState)

ngOnDestroy:
  destroy$.next() + complete()
```

---

## 🧭 Shared: NavbarComponent

**Path:** `src/app/shared/navbar/`
**Selector:** `<app-navbar>`

### Files

| File | Description |
|---|---|
| `navbar.component.ts` | isAuthenticated / username getters from AuthService, login/logout |
| `navbar.component.html` | Logo + links (/, /offers) + conditional login/logout |
| `navbar.component.css` | Sticky header, glassmorphism |

### Implementation

```typescript
export class NavbarComponent {
  constructor(private readonly authService: AuthService) {}

  get isAuthenticated() { return this.authService.isAuthenticated; }
  get username()        { return this.authService.username; }

  async login():  Promise<void> { await this.authService.login(); }
  async logout(): Promise<void> { await this.authService.logout(); }
}
```

> 💡 Getters (not fields) because `authService.isAuthenticated` is a **Signal** (a function). In the template: `*ngIf="isAuthenticated()"` — calling the function.

### No local state

All state comes from `AuthService` (Signals). The component is reactive — when `isAuthenticated` changes value, Angular refreshes the view automatically (signal-based change detection).

---

## 🦶 Shared: FooterComponent

**Path:** `src/app/shared/footer/`
**Selector:** `<app-footer>`

### Files

| File | Description |
|---|---|
| `footer.component.ts` | Empty (`RouterModule` for `routerLink`) |
| `footer.component.html` | Links to `/legal`, `/about`, copyright, project name |
| `footer.component.css` | Footer grid layout |

### Implementation

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

Empty class. All the value is in the HTML/CSS.

---

## 🧠 Shared: TechPickerComponent

**Path:** `src/app/shared/tech-picker/tech-picker.component.ts` (inline template/styles)
**Selector:** `<app-tech-picker>`

A multi-select with autocomplete for **technologies**. Inline template + inline styles (a small component, easier to keep in one file).

### Inputs

| Input | Type | Description |
|---|---|---|
| `technologies` | `LocationItem[]` | List of available technologies (from LookupsApi) |
| `selected` | `LocationItem[]` | Currently selected (controlled from outside) |

> The placeholders are hardcoded in the template ("Wpisz lub wybierz technologię…" / "Dodaj kolejną…").

### Outputs

| Output | Type | Description |
|---|---|---|
| `selectedChange` | `LocationItem[]` | Emitted on every selection change |

### UI elements

- **Field** (`.tp-field`): chevron + selected tags (with `×`) + a typing input
- **Badge** (`.tp-badge`): the count of selected items
- **Clear button** (`.tp-clear`): clears the whole selection
- **Dropdown** (`.tp-dropdown`): header with a counter + an option list with `[innerHTML]="highlight(item.name)"` (match highlighting)

### Behavior

- **Autocomplete** filters `technologies` by `query` (substring match, case-insensitive, excludes already-selected)
- **Click outside** closes the dropdown (`@HostListener`)
- **Escape** closes the dropdown
- **Scroll** closes the dropdown (it would otherwise be aligned to the field's old position)

### Highlighting

`highlight(name)` uses `highlightMatch(name, query, '#4338ca')` from `shared/highlight.ts` — returns HTML with a `<strong style="color:#4338ca">` around the match, **escaped** against XSS.

---

## 📍 Shared: LocationPickerComponent

**Path:** `src/app/shared/location-picker/location-picker.component.ts` (inline template/styles)
**Selector:** `<app-location-picker>`

A multi-select with autocomplete for **cities/locations**. Very similar to the TechPicker — in fact it shares the `LocationItem` interface with it.

### Exported interface

```typescript
export interface LocationItem {
  id: string;
  name: string;
}
```

> 💡 `LocationItem` is used **EVERYWHERE** — in FiltersFormComponent, TechPickerComponent, FiltersInitialState/FiltersValue, in home/offers/profile. It's the main lookup type in the app.

### Inputs

| Input | Type | Description |
|---|---|---|
| `locations` | `LocationItem[]` | List of available cities |
| `selected` | `LocationItem[]` | Currently selected |

### Outputs

| Output | Type | Description |
|---|---|---|
| `selectedChange` | `LocationItem[]` | Emitted on every change |

### UI elements

- **Field** (`.lp-field`): pin icon + tags (with `×`) + input
- **Dropdown** (`.lp-dropdown`): option list with highlighting + a "Brak wyników" message
- **Clear button** (`.lp-clear`): clears the whole selection

### Behavior

- **mousedown on an option** (not click!) — because `blur` on the input would fire before `click` and close the dropdown. `mousedown` fires before `blur`.
- **focus/blur** drive `showDropdown` with a small delay (`setTimeout 160`) so an option click registers in time.

### Highlighting

Like the TechPicker — `highlightMatch(name, query, '#4f46e5')`.

> ⚠️ Remote work is a **separate checkbox** in FiltersFormComponent (a work mode), not a location. The location list is physical cities.

---

## ✨ Shared: highlight.ts

**Path:** `src/app/shared/highlight.ts`

A helper for safely highlighting parts of text matching a query (autocomplete dropdowns).

### API

```typescript
export function highlightMatch(name: string, query: string, color: string): string;
```

### Implementation

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

### Security

> 🛡️ **XSS-safe.** `escapeHtml()` escapes every raw-text section before inserting it into `<strong>`. The result is injected via `[innerHTML]`, which would normally be dangerous — hence the escaping is **mandatory**.

What's escaped:
- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`

The apostrophe (`'`) is not escaped because we don't use it in inline attributes with single quotes. The `color` argument is **code-controlled** (the pickers pass `'#4338ca'` and `'#4f46e5'`), it never comes from the user.

---

## 📚 Related documents

- [`README.md`](../README.md) — quick-start
- [`docs/architecture.md`](architecture.md) — Angular patterns (standalone, Signals, OnPush)
- [`docs/api-services.md`](api-services.md) — API services used by the features
- [`docs/auth-flow.md`](auth-flow.md) — Keycloak flow + authGuard protecting `/profile`
