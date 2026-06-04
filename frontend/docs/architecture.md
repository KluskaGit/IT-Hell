# 🏗️ Architecture — IT-Hell Frontend

This document describes the architectural patterns and design decisions used in the Angular 21 app. It complements the [main README](../README.md).

## 📑 Table of contents

- [Standalone Components](#standalone-components)
- [Angular Signals instead of RxJS Subject](#angular-signals-instead-of-rxjs-subject)
- [OnPush Change Detection](#onpush-change-detection)
- [SSR and Hydration](#ssr-and-hydration)
- [State management](#state-management)
- [Memory leak prevention](#memory-leak-prevention)
- [Debouncing and throttling](#debouncing-and-throttling)
- [HTTP layer and interceptors](#http-layer-and-interceptors)
- [Lazy loading and bundle size](#lazy-loading-and-bundle-size)

---

## Standalone Components

The app uses **100% standalone components** (Angular 14+). No `NgModule` — each component declares its own dependencies in `imports`.

**Bootstrap example (`src/main.ts`):**

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig);
```

**Provider configuration (`src/app/app.config.ts`):**

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

**Why:**
- Less boilerplate — a component declares **exactly** what it needs
- Better tree-shaking in the bundler
- Easier to move components between projects
- Fewer "magic" dependency injection chains

---

## Angular Signals instead of RxJS Subject

Global state (e.g. whether the user is logged in) is held in **Angular Signals** instead of `BehaviorSubject` / `Observable`.

**Example (`src/features/auth/auth.service.ts`):**

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  // Signal instead of BehaviorSubject<boolean>(false)
  isAuthenticated = signal(false);
  username = signal<string | null>(null);

  async init() {
    await this.keycloak.init({ onLoad: 'check-sso', pkceMethod: 'S256' });
    this.isAuthenticated.set(!!this.keycloak.authenticated);
    this.username.set(this.keycloak.tokenParsed?.['given_name'] ?? null);
  }
}
```

**Use in a template:**

```html
@if (auth.isAuthenticated()) {
  <span>Witaj, {{ auth.username() }}</span>
}
```

**Advantages over RxJS:**
- No need for a subscription or the `async` pipe
- No memory leak risk (Signals are managed by Angular)
- Synchronous read — the value is always available immediately (`auth.isAuthenticated()`)
- Reactivity at the change-detection level — Angular refreshes the view automatically

**Where we still use RxJS:**
- `HttpClient` returns `Observable<T>` — converted to a Promise via `firstValueFrom()` in the API services
- UI event streams (e.g. `filtersTrigger$` in `offers.component.ts`) with `debounceTime()`
- `takeUntil(destroy$)` to avoid memory leaks in components

---

## OnPush Change Detection

Heavily-updated components (e.g. `OffersComponent` with infinite scroll) use `ChangeDetectionStrategy.OnPush` and a manual `cdr.markForCheck()` after asynchronous updates.

**Benefit:** Angular doesn't check this component on every tick — only when:
1. An `@Input` reference changes
2. An `@Output` event is emitted
3. `markForCheck()` is called manually
4. A Signal used in the template changes value

As a result, a list of 500+ offers with filters doesn't re-render the whole tree on every event.

---

## SSR and Hydration

The repository contains **Angular SSR scaffolding** (`@angular/ssr`) intended to be served by **Express** (`src/server.ts`):

- `src/main.server.ts` — the SSR bootstrap
- `src/app/app.config.server.ts` — merges `appConfig` with `provideServerRendering()`
- `src/app/app.routes.server.ts` — `RenderMode` per route
- `src/server.ts` — the Express runtime that serves `dist/.../browser` and handles SSR

### ⚠️ SSR is not wired into the build yet

The current build target in `angular.json` defines only `browser` (`src/main.ts`) — there is **no `server` / `ssr` / `outputMode`** option. Because of that:

- `npm run build` produces a **client-only SPA** (`dist/cv-analizer/browser/`); it does **not** emit `dist/cv-analizer/server/server.mjs`.
- The `npm run serve:ssr:cv-analizer` script (which runs `node dist/cv-analizer/server/server.mjs`) won't work until SSR is enabled in `angular.json`.
- The per-route `RenderMode` settings in `app.routes.server.ts` are therefore **dormant** — they take effect only once SSR is enabled.

In Docker the app is shipped as **static files served by nginx** (see the [frontend README](../README.md)).

### `RenderMode` per route (`src/app/app.routes.server.ts`)

These settings are kept ready for when SSR is enabled:

```typescript
export const serverRoutes: ServerRoute[] = [
  { path: 'offers', renderMode: RenderMode.Client },  // browser-only
  { path: '**', renderMode: RenderMode.Prerender }    // static prerender at build time
];
```

**Why `/offers` would have to stay `Client`** (once SSR is on):
- `IntersectionObserver` (infinite scroll) — not available in Node.js
- `localStorage` (filter cache) — not available in Node.js
- `history.state` (filters from `/`) — not available in SSR

### Critical gotcha — Keycloak + SSR

`AuthService.init()` early-returns when `!isPlatformBrowser(platformId)`. Otherwise Keycloak would try to use `window`/`document` in Node.js and crash the SSR process. This guard matters as soon as SSR is enabled.

```typescript
async init(): Promise<void> {
  if (!isPlatformBrowser(this.platformId)) return;
  // ... rest of init
}
```

---

## State management

No global store (NgRx/NGXS). State is spread across:

| State type | Where it lives | Example |
|---|---|---|
| **Auth state** | `AuthService` (Signals) | `isAuthenticated()`, `username()` |
| **Form state** | `FiltersFormComponent` (`FormGroup`) | seniority/tech/salary filters |
| **Filter persistence** | `localStorage` (key `cv_analizer_candidate_filters`) | shared across `/`, `/offers`, `/profile` |
| **Cross-route data** | `history.state` (Angular Router) | passing filters from `/` to `/offers` |
| **URL state** | `queryParamMap` | shareable links to `/offers?tech=react&exp=mid` |
| **Lookup cache** | `LookupsApiService` (in-memory) | technologies, locations, job boards |

**Filter read priority** (`OffersComponent` on init): `URL query params > history.state > localStorage > defaults {}`. How each source is resolved is detailed in [`docs/features.md`](features.md).

---

## Memory leak prevention

Components with long-lived subscriptions (e.g. `OffersComponent` with `filtersTrigger$.pipe(debounceTime).subscribe(...)`) use the **`destroy$` + `takeUntil`** pattern:

```typescript
private destroy$ = new Subject<void>();

ngOnInit() {
  this.filtersTrigger$.pipe(
    debounceTime(700),
    takeUntil(this.destroy$)
  ).subscribe(...);
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
  // + disconnect IntersectionObserver, clearInterval(refreshIntervalId)
}
```

In addition, `AuthService.startTokenRefresh()` uses `window.setInterval` and `stopTokenRefresh()` (`clearInterval`) — without it, it would keep trying to refresh the token every 20s after logout.

---

## Debouncing and throttling

| Action | Mechanism | Time |
|---|---|---|
| Filter change (offers) | RxJS `debounceTime(700)` | 700 ms |
| Title search | RxJS `debounceTime(500)` | 500 ms |
| Keycloak token refresh | `setInterval` | 20 s |
| Token validity check | `keycloak.updateToken(30)` | minValidity = 30 s |

**Why 700 ms for filters:** users click several checkboxes in a row, so the changes are debounced into a single request. The per-component split (filters 700 ms vs. search 500 ms, and the `skip(1)` first-load guard) is detailed in [`docs/features.md`](features.md).

---

## HTTP layer and interceptors

`provideHttpClient(withFetch(), withInterceptors([authInterceptor]))` — we use the **Fetch API** (not XHR) and a functional interceptor.

### Auth interceptor (`src/app/app.config.ts`)

A functional interceptor attaches `Authorization: Bearer <token>` **only to `/v1/*` requests**
(assets, fonts and Keycloak endpoints get no token), and only when a token is available. The code
and the full rationale live in [`docs/auth-flow.md`](auth-flow.md) — not repeated here.

### No error interceptor

Error handling **lives in the components** — each uses its own strategy (toast, banner, fallback). A central error interceptor would cost flexibility with no clear gain (each endpoint handles 401/404/500 differently).

---

## Lazy loading and bundle size

**Currently:** all features are eagerly imported in `app.routes.ts`. This is fine because the app is fairly small (~5 pages).

**Limits in `angular.json` (production budgets):**

```json
"budgets": [
  { "type": "initial",           "maximumWarning": "500kB", "maximumError": "1MB" },
  { "type": "anyComponentStyle", "maximumWarning": "10kB",  "maximumError": "20kB" }
]
```

> Note: a couple of component stylesheets (e.g. `offers.component.css`, `home.component.css`) currently exceed the 10kB warning budget — warnings only, the build still succeeds.

**Possible optimization:** switch to `loadComponent`:

```typescript
{ path: 'offers', loadComponent: () => import('../features/offers/offers.component').then(m => m.OffersComponent) }
```

`/offers` would gain the most (the most complex component, 600+ lines, uses all the lookup services).

---

## 📚 Related documents

- [`README.md`](../README.md) — quick-start and overview
- [`docs/features.md`](features.md) — details of each feature
- [`docs/api-services.md`](api-services.md) — the API layer
- [`docs/auth-flow.md`](auth-flow.md) — the Keycloak PKCE flow
