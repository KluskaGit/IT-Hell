# 🏗️ Architektura — CV_ANALIZER Frontend

Dokument opisuje wzorce architektoniczne i decyzje projektowe użyte w aplikacji Angular 21. Jest uzupełnieniem [głównego README](../README.md).

## 📑 Spis treści

- [Standalone Components](#standalone-components)
- [Angular Signals zamiast RxJS Subject](#angular-signals-zamiast-rxjs-subject)
- [OnPush Change Detection](#onpush-change-detection)
- [SSR i Hydration](#ssr-i-hydration)
- [Zarządzanie stanem](#zarządzanie-stanem)
- [Memory leak prevention](#memory-leak-prevention)
- [Debouncing i throttling](#debouncing-i-throttling)
- [HTTP layer i interceptors](#http-layer-i-interceptors)
- [Lazy loading i bundle size](#lazy-loading-i-bundle-size)

---

## Standalone Components

Aplikacja **w 100% używa standalone components** (Angular 14+). Brak `NgModule`, każdy komponent deklaruje własne zależności w `imports`.

**Przykład bootstrapu (`src/main.ts`):**

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig);
```

**Konfiguracja providerów (`src/app/app.config.ts`):**

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    { provide: LOCALE_ID, useValue: 'pl' },
    { provide: APP_INITIALIZER, useFactory: ..., deps: [AuthService], multi: true }
  ]
};
```

**Dlaczego tak:**
- Mniej boilerplate — komponent deklaruje **dokładnie** czego potrzebuje
- Lepsze tree-shaking w bundlerze
- Łatwiejsze przenoszenie komponentów między projektami
- Mniej "magicznych" dependency injection chain'ów

---

## Angular Signals zamiast RxJS Subject

Stan globalny (np. czy użytkownik jest zalogowany) trzymany jest w **Angular Signals** zamiast `BehaviorSubject` / `Observable`.

**Przykład (`src/features/auth/auth.service.ts`):**

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  // Signal zamiast BehaviorSubject<boolean>(false)
  isAuthenticated = signal(false);
  username = signal<string | null>(null);

  async init() {
    const ok = await this.keycloak.init({ onLoad: 'check-sso', pkceMethod: 'S256' });
    this.isAuthenticated.set(ok);
    this.username.set(this.keycloak.tokenParsed?.['given_name'] ?? null);
  }
}
```

**Użycie w szablonie:**

```html
@if (auth.isAuthenticated()) {
  <span>Witaj, {{ auth.username() }}</span>
}
```

**Przewaga nad RxJS:**
- Brak konieczności subskrypcji ani `async` pipe
- Brak ryzyka memory leak (Signals są zarządzane przez Angulara)
- Synchroniczny odczyt — wartość zawsze dostępna od razu (`auth.isAuthenticated()`)
- Reaktywność na poziomie change detection — Angular automatycznie odświeża widok

**Kiedy nadal używamy RxJS:**
- `HttpClient` zwraca `Observable<T>` — kowertowane na Promise przez `firstValueFrom()` w serwisach API
- Strumienie eventów UI (np. `filtersTrigger$` w `offers.component.ts`) z `debounceTime()` i `switchMap()`
- `takeUntil(destroy$)` do uniku memory leaków w komponentach

---

## OnPush Change Detection

Komponenty intensywnie aktualizowane (np. `OffersComponent` z infinite scroll) używają `ChangeDetectionStrategy.OnPush` i manualnego `cdr.markForCheck()` po asynchronicznych aktualizacjach.

**Korzyść:** Angular nie sprawdza tego komponentu przy każdym ticku — tylko gdy:
1. Zmieni się referencja `@Input`
2. Zostanie wyemitowany event z `@Output`
3. Zostanie wywołany `markForCheck()` ręcznie
4. Signal użyty w szablonie zmieni wartość

W efekcie lista 500+ ofert z filtrami nie powoduje przerenderowania całego drzewa przy każdym evencie.

---

## SSR i Hydration

Projekt używa **Angular SSR** (`@angular/ssr`) serwowanego przez **Express** (`src/server.ts`). Build produkcyjny daje dwa artefakty: `dist/cv-analizer/browser/` (CSR) i `dist/cv-analizer/server/server.mjs` (SSR).

### Konfiguracja serwera (`src/app/app.config.server.ts`)

Plik mergeuje `appConfig` z dodatkowymi providerami dla SSR — `provideServerRendering(withRoutes(serverRoutes))`.

### RenderMode per route (`src/app/app.routes.server.ts`)

```typescript
export const serverRoutes: ServerRoute[] = [
  { path: 'offers', renderMode: RenderMode.Client },  // browser-only
  { path: '**', renderMode: RenderMode.Prerender }    // statyczny prerender przy buildzie
];
```

**Dlaczego `/offers` musi być `Client`:**
- `IntersectionObserver` (infinite scroll) — brak w Node.js
- `localStorage` (cache filtrów) — brak w Node.js
- `history.state` (filtry z `/`) — niedostępne w SSR

**Pozostałe trasy są prerenderowane** przy buildzie — szybki time-to-first-byte, dobry SEO.

### Krytyczna pułapka — Keycloak + SSR

`AuthService.init()` ma early-return gdy `!isPlatformBrowser(platformId)`. W przeciwnym razie Keycloak próbowałby użyć `window`/`document` w Node.js i crashował SSR proces.

```typescript
async init(): Promise<void> {
  if (!isPlatformBrowser(this.platformId)) return;
  // ... reszta init
}
```

---

## Zarządzanie stanem

Brak globalnego store (NgRx/NGXS). Stan rozsiany po:

| Typ stanu | Gdzie żyje | Przykład |
|---|---|---|
| **Auth state** | `AuthService` (Signals) | `isAuthenticated()`, `username()` |
| **Form state** | `FiltersFormComponent` (`FormGroup`) | filtry seniority/tech/salary |
| **Persistencja filtrów** | `localStorage` (klucz `cv_analizer_candidate_filters`) | współdzielony między `/`, `/offers`, `/profile` |
| **Cross-route data** | `history.state` (Angular Router) | przeniesienie filtrów z `/` do `/offers` |
| **URL state** | `queryParamMap` | shareable links do `/offers?tech=react&exp=mid` |
| **Cache słowników** | `LookupsApiService` (in-memory) | technologie, lokalizacje, portale |

**Priorytety odczytu filtrów (`OffersComponent` przy inicjalizacji):**

```
URL query params  >  history.state  >  localStorage  >  defaults {}
```

---

## Memory leak prevention

Komponenty z długo żyjącymi subskrypcjami (np. `OffersComponent` z `filtersTrigger$.pipe(debounceTime).subscribe(...)`) używają wzorca **`destroy$` + `takeUntil`**:

```typescript
private destroy$ = new Subject<void>();

ngOnInit() {
  this.filtersTrigger$.pipe(
    debounceTime(700),
    switchMap(filters => this.api.getOffers(filters)),
    takeUntil(this.destroy$)
  ).subscribe(...);
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
  // + odpięcie IntersectionObserver, clearInterval(refreshIntervalId)
}
```

Dodatkowo `AuthService.startTokenRefresh()` używa `window.setInterval` i `stopTokenRefresh()` (`clearInterval`) — bez tego co 20 s próbowałby refreshować token po logoucie.

---

## Debouncing i throttling

| Akcja | Mechanizm | Czas |
|---|---|---|
| Zmiana filtrów (offers) | RxJS `debounceTime(700)` | 700 ms |
| Wyszukiwanie po tytule | RxJS `debounceTime(500)` | 500 ms |
| Refresh tokenu Keycloak | `setInterval` | 20 s |
| Token validity check | `keycloak.updateToken(30)` | minValidity = 30 s |

**Dlaczego 700 ms na filtry:** użytkownik często klika kilka checkboxów pod rząd (np. 3 technologie) — bez debounce każdy klik powodował reload listy ofert (3× request). Z `debounceTime(700)` wysyłany jest jeden request po stabilnej zmianie.

---

## HTTP layer i interceptors

`provideHttpClient(withFetch(), withInterceptors([authInterceptor]))` — używamy **Fetch API** (nie XHR) i funkcyjnego interceptora.

### Auth Interceptor (`src/app/app.config.ts:14-21`)

```typescript
const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  if (token && req.url.includes('/v1/')) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  return next(req);
};
```

**Logika:**
- Tylko żądania do `/v1/*` dostają nagłówek (np. assety, fonty, Keycloak endpointy — bez tokenu)
- Brak tokenu = brak nagłówka (anonimowe wywołania pozwolone dla części endpointów)
- Token pobierany przez `auth.getToken()` (świeży, bo `startTokenRefresh()` odświeża co 20 s)

### Brak error interceptora

Error handling **jest w komponentach** — każdy używa własnej strategii (toast, banner, fallback). Centralny error interceptor byłby kosztem elastyczności bez wyraźnych zysków (każdy endpoint inaczej obsługuje 401/404/500).

---

## Lazy loading i bundle size

**Obecnie:** wszystkie features są eagerly importowane w `app.routes.ts`. Działa to bo aplikacja jest stosunkowo mała (~5 stron).

**Limity w `angular.json` (production budgets):**

```json
"budgets": [
  { "type": "initial",            "maximumWarning": "500kB", "maximumError": "1MB" },
  { "type": "anyComponentStyle",  "maximumWarning": "4kB",   "maximumError": "8kB" }
]
```

**Możliwa optymalizacja:** przejście na `loadComponent`:

```typescript
{ path: 'offers', loadComponent: () => import('../features/offers/offers.component').then(m => m.OffersComponent) }
```

Najwięcej zyska `/offers` (najbardziej skomplikowany komponent, 600+ linii, używa wszystkich serwisów lookup).

---

## 📚 Powiązane dokumenty

- [`README.md`](../README.md) — quick-start i przegląd
- [`docs/features.md`](features.md) — szczegóły każdego feature
- [`docs/api-services.md`](api-services.md) — warstwa API
- [`docs/auth-flow.md`](auth-flow.md) — Keycloak PKCE flow
