# 🏗️ Architektura — CV_ANALIZER Frontend

Dokument opisuje wzorce architektoniczne i decyzje projektowe użyte w aplikacji Angular 21. Jest uzupełnieniem [głównego README](../README.md).

## 📑 Spis treści

- [Standalone Components](#standalone-components)
- [Angular Signals zamiast RxJS Subject](#angular-signals-zamiast-rxjs-subject)
- [OnPush Change Detection](#onpush-change-detection)
- [SSR — setup w kodzie, nieużywany w produkcji](#ssr--setup-w-kodzie-nieużywany-w-produkcji)
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

## SSR — setup w kodzie, nieużywany w produkcji

Projekt ma w pełni przygotowany **setup SSR** (`@angular/ssr` + Express + `src/server.ts` + `src/main.server.ts` + `src/app/app.config.server.ts` + `src/app/app.routes.server.ts`), ale **produkcyjny build go nie aktywuje** — `angular.json` w `options` zawiera tylko `browser`, bez kluczy `server`, `outputMode: "server"`, `ssr.entry`. Wynik `npm run build` to czysta SPA pod `dist/cv-analizer/browser/`.

### Dlaczego SSR jest wyłączony w produkcji

Próba aktywacji SSR + prerenderingu **crashowała build w Dockerze**, bo Angular przy budowie próbował wywołać `/v1/lookups/technologies` (i 5 innych) — backend wtedy jeszcze nie istnieje (build kontenera odbywa się przed startem `compose up`), a `apiUrl: '/v1'` to relative URL nieobsługiwany w Node.js bez bazowego URL.

Plus dla `/profile` i `/offers` — wymagają `keycloak-js`, `localStorage`, `IntersectionObserver` — niedostępne w Node.js. Te trasy musiałyby być `RenderMode.Client`, co w praktyce sprowadza je do CSR i tak.

### Co zostaje w kodzie SSR

Pliki `server.ts`, `main.server.ts`, `app.config.server.ts`, `app.routes.server.ts` **istnieją** i są kompatybilne z `@angular/ssr` API. Jeśli kiedyś projekt będzie potrzebował SSR (np. dla SEO landing page'a):

1. Dodać do `angular.json` w sekcji `options`:
   ```json
   "server": "src/main.server.ts",
   "outputMode": "server",
   "ssr": { "entry": "src/server.ts" }
   ```
2. Zastąpić `relative URL` w API services absolute URL z runtime config (zobacz „Cloud deployment" w README)
3. Zbudować backend przed buildem frontendu (multi-stage compose) ALBO zmienić `apiUrl` na URL osiągalny z buildera

### Ślady SSR-defensywne w kodzie

Mimo że SSR jest wyłączony w produkcji, kod **nadal jest SSR-safe** — `AuthService.init()` i wiele innych miejsc używa guarda `isPlatformBrowser()`:

```typescript
async init(): Promise<void> {
  if (!isPlatformBrowser(this.platformId)) return;
  // ... reszta init
}
```

To jest bezpieczne podejście — gdyby kiedyś ponownie włączyć SSR, kod nie crashuje. Dodatkowo `app.routes.server.ts` ma poprawnie ustawione `/offers` na `RenderMode.Client` (na wypadek użycia trybu serwera).

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
