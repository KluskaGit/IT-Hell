<div align="center">

# IT-Hell — Frontend

### 🎯 Upload your CV, get matched IT job offers from across Poland

The Angular web layer of **IT-Hell**: drag in a CV (PDF/DOCX), the app detects technologies and
seniority, then matches it against offers scraped from major Polish job boards.

[![Angular](https://img.shields.io/badge/Angular-21-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Keycloak](https://img.shields.io/badge/Keycloak-26.6-4D4D4D?style=for-the-badge&logo=keycloak&logoColor=white)](https://www.keycloak.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

<div align="center">
  <img src="docs/images/Hero.png" alt="IT-Hell — home page" width="900">
</div>

> This document covers **only the frontend**. For the project overview, the full-stack setup
> (`docker compose up`), Keycloak configuration and the system architecture, see the
> **[root README](../README.md)**.

---

## ✨ UI features

- 🪄 **Drag & drop CV** — in-place analysis with a scanning animation and auto-filled filters
- 🔍 **Advanced filters** — technologies, specialization, seniority, salary range, location, work mode, job boards
- ♾️ **Infinite scroll** of offers (`IntersectionObserver`) with a resizable sidebar
- 🔐 **Keycloak login** straight from the SPA (PKCE S256, Google/GitHub social login)
- 💾 **Persistent profile** — save the CV (base64) and filter preferences to the backend (logged-in users)
- 🌐 **SSR-ready** — `@angular/ssr` + Express scaffolding in place, not yet wired into the build (the app ships as a client-only SPA — see [`docs/architecture.md`](docs/architecture.md))
- 🎨 **Glassmorphism UI** — gradients, glow effects, animated background
- 🇵🇱 **`pl` locale** — Polish date, currency and text formatting

<table>
  <tr>
    <td width="50%">
      <img src="docs/images/cv-analysis.png" alt="CV analysis" width="100%">
      <p align="center"><sub><b>CV analysis</b> — drop a PDF/DOCX, extract technologies, auto-fill filters</sub></p>
    </td>
    <td width="50%">
      <img src="docs/images/offers-list.png" alt="Offers list" width="100%">
      <p align="center"><sub><b>Offers list</b> — filter sidebar, infinite scroll, title search</sub></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/images/offer-card-matched.png" alt="Offer card with matches" width="100%">
      <p align="center"><sub><b>Offer card</b> — highlights technologies matching the active filters</sub></p>
    </td>
    <td width="50%">
      <img src="docs/images/profile-view.png" alt="User profile" width="100%">
      <p align="center"><sub><b>Profile</b> — persist CV and preferences (logged-in users)</sub></p>
    </td>
  </tr>
</table>

---

## 🛠️ Tech stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Angular (standalone components) | **21.2** |
| Language | TypeScript | **5.9** |
| Reactivity | Angular Signals + RxJS | 7.8 |
| Forms | `@angular/forms` (Reactive Forms) | 21.2 |
| Routing | `@angular/router` + server routes | 21.2 |
| Auth | `keycloak-js` (PKCE S256) | 26.2 |
| SSR | `@angular/ssr` + Express | 21.2 / 5.1 |
| HTTP | `HttpClient` (Fetch) + interceptors | 21.2 |
| Tests | Vitest + jsdom | 4.0 / 28 |

---

## 🚀 Local development

Requires **Node.js 20+**. The backend, Keycloak and the database are expected to be running already
(see the [root README](../README.md) — `docker compose up -d --build`).

```bash
cd frontend
npm install          # first run: 2–5 min
npm start            # dev server on http://localhost:4200
```

`npm start` runs `ng serve` with the proxy from `proxy.conf.json`: requests to `/v1/*` are forwarded
to `http://localhost:8000/v1/*`, so there are no CORS issues in development.

Open **http://localhost:4200**, drop a test CV on the home page, then click **Log in** to go through
the Keycloak flow.

---

## 📁 Project structure

```
frontend/
├── public/                        # static assets (favicon, images) → copied to dist/
│
├── src/
│   ├── app/
│   │   ├── core/                  # app-wide singletons (services, guards, models)
│   │   │   ├── guards/auth.guard.ts          # CanActivateFn — blocks /profile when logged out
│   │   │   ├── models/offers.models.ts       # DTOs: JobOfferApiResponse, LookupDto, MappedOffer
│   │   │   └── services/
│   │   │       ├── job-offers-api.service.ts  # GET /v1/job-offers/get_offer_filter
│   │   │       ├── user-api.service.ts        # GET/PUT /v1/users/me/profile
│   │   │       ├── cv-api.service.ts          # POST /v1/cv/upload (multipart CV analysis)
│   │   │       └── lookups-api.service.ts     # GET /v1/lookups/* (techs, locations, sites)
│   │   │
│   │   ├── shared/                # reusable UI components
│   │   │   ├── filters-form/      # ⭐ shared filter form (home / offers / profile)
│   │   │   ├── navbar/            # top bar with login/logout + username
│   │   │   ├── footer/            # footer with /about, /legal links
│   │   │   ├── location-picker/   # city multi-select with autocomplete
│   │   │   ├── tech-picker/       # technology multi-select with autocomplete
│   │   │   └── highlight.ts       # text-match highlighting helper
│   │   │
│   │   ├── app.ts                 # root standalone component
│   │   ├── app.config.ts          # providers: routing, HttpClient, auth interceptor, APP_INITIALIZER
│   │   ├── app.config.server.ts   # appConfig merge + provideServerRendering()
│   │   ├── app.routes.ts          # Angular Router routes (client)
│   │   ├── app.routes.server.ts   # per-route RenderMode (Client vs Prerender)
│   │   └── keycloak.config.ts     # environment → Keycloak config (url/realm/clientId)
│   │
│   ├── features/                  # pages — one folder per route
│   │   ├── auth/auth.service.ts   # ⭐ Keycloak: init, login, logout, isAuthenticated/username signals
│   │   ├── home/                  # /        — drop CV, filter form, hero
│   │   ├── offers/                # /offers  — offers list + infinite scroll + sidebar
│   │   ├── profile/               # /profile — user data + CV + preferences
│   │   ├── about/                 # /about   — static project page
│   │   └── legal/                 # /legal   — terms + FAQ (tabs)
│   │
│   ├── environments/environment.ts  # apiUrl=/v1, keycloakUrl, realm, clientId
│   ├── main.ts                    # CSR bootstrap
│   ├── main.server.ts             # SSR bootstrap
│   ├── server.ts                  # Express runtime for SSR
│   └── styles.css                 # global styles (fonts, reset, CSS variables)
│
├── docs/                          # extended frontend documentation (see table below)
├── proxy.conf.json                # dev proxy: /v1 → http://localhost:8000
├── nginx.conf                     # nginx config used by the Docker image
├── Dockerfile                     # multi-stage build (node → nginx)
└── angular.json                   # Angular CLI config (build, serve, test)
```

The project uses **standalone components** end to end — no `NgModule`. `core/` holds app-wide
singletons, `shared/` holds reusable UI, `features/` holds one folder per page/route.

---

## 🗺️ Routing

Defined in `src/app/app.routes.ts` and `src/app/app.routes.server.ts`:

| Path | Component | Auth guard | SSR mode | Notes |
|---|---|---|---|---|
| `/` | `HomeComponent` | — | `Prerender` | Drop CV + filter form |
| `/offers` | `OffersComponent` | — | **`Client`** | Needs `IntersectionObserver` + `localStorage` |
| `/profile` | `ProfileComponent` | ✅ `authGuard` | `Prerender` | Logged-in users only |
| `/about` | `AboutComponent` | — | `Prerender` | Static |
| `/legal` | `LegalComponent` | — | `Prerender` | Tabs via `?tab=` |
| `/login`, `/register`, `/forgot-password` | redirect → `/` | — | — | Handled by Keycloak |
| `**` | redirect → `/` | — | — | Catch-all |

> `/offers` is **client-only** because it relies on `IntersectionObserver` (infinite scroll),
> `localStorage` (filter cache) and `history.state` (filters passed from `/`) — none available in SSR.

---

## 🔐 Authentication (frontend side)

The SPA authenticates against **Keycloak** using **PKCE S256**. Frontend pieces:

- **`AuthService`** (`src/features/auth/auth.service.ts`) — singleton exposing `isAuthenticated` and `username` signals; wraps `keycloak-js` `init`/`login`/`logout`.
- **Auth interceptor** (`src/app/app.config.ts`) — attaches `Authorization: Bearer <token>` to every `/v1/*` request.
- **`authGuard`** (`src/app/core/guards/auth.guard.ts`) — `CanActivateFn` protecting `/profile`; redirects to Keycloak when there is no session.
- **`APP_INITIALIZER`** (`src/app/app.config.ts`) — runs `AuthService.init()` before bootstrap (max ~5s; the app still loads if Keycloak is unreachable).
- **Token refresh** — `keycloak.updateToken(30)` on a 20s interval.

The full PKCE flow (with failure points) lives in [`docs/auth-flow.md`](docs/auth-flow.md). Keycloak
realm setup is in the [root README](../README.md).

---

## 📜 npm scripts

| Command | What it does |
|---|---|
| `npm start` | Dev server on `:4200` with the `/v1 → :8000` proxy and live reload |
| `npm run build` | Production build (client-only SPA) to `dist/cv-analizer/browser/` |
| `npm run watch` | Watch-mode build (development config) |
| `npm test` | Unit tests via Vitest |
| `npm run serve:ssr:cv-analizer` | Run the SSR server from `dist/cv-analizer/server/server.mjs` — requires SSR enabled in `angular.json` first (see [`docs/architecture.md`](docs/architecture.md)) |
| `npm run ng` | Raw Angular CLI (e.g. `npm run ng -- generate component ...`) |

---

## 🐳 Docker image

The frontend ships as a single `frontend` service (built from `frontend/Dockerfile`). It is a
**multi-stage** build:

1. **builder** (`node:20-alpine`) — `npm ci` + `npm run build`
2. **runtime** (`nginx:1.27-alpine`) — serves the **static** browser bundle from
   `dist/cv-analizer/browser`; `nginx.conf` proxies `/v1/` to `backend:8000` and falls back to
   `index.html` for client-side routes.

`compose.yaml` publishes the service as `4200:80`, so the containerized app is available at
**http://localhost:4200**.

> SSR (`server.ts`, `npm run serve:ssr:cv-analizer`) exists for local use, but the Docker image
> ships the static nginx build, not the Node/Express SSR server.

To run the whole stack (backend + frontend + auth + DB) with one command, see the
[root README](../README.md).

---

## ⚠️ Troubleshooting (frontend)

| Problem | Likely cause | Fix |
|---|---|---|
| Login fails with an **SSR error** (once SSR is enabled) | Route render mode is wrong | `/offers` must be `Client` in `src/app/app.routes.server.ts`, the rest `Prerender` |
| App loads **without styles** on first run | The dev server is still compiling the initial bundle | Wait for `ng serve` to finish the first compilation, then refresh |
| `/profile` **redirects to `/`** | Keycloak session expired and wasn't detected | Clear cookies for `localhost:8080` and `localhost:4200`, hard refresh |
| `npm install` fails with **`EBADENGINE`** | Node < 20 | Install Node 20 LTS, check `node -v` |

For backend, CORS or Keycloak issues see the [root README](../README.md).

---

## 📚 Extended documentation

Deeper frontend docs live in [`docs/`](docs/):

| File | Contents |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Angular 21 patterns: standalone, Signals, OnPush, SSR/Hydration, state |
| [`docs/features.md`](docs/features.md) | Each feature (home, offers, profile, about, legal) + shared components |
| [`docs/api-services.md`](docs/api-services.md) | API services, DTOs, backend endpoints, proxy config |
| [`docs/auth-flow.md`](docs/auth-flow.md) | Full Keycloak PKCE flow, interceptor, guard, token refresh |
| [`docs/env-vars.md`](docs/env-vars.md) | Frontend env reference (`environment.ts`, `proxy.conf.json`) — backend/Docker vars live at the [root README](../README.md) |
| [`docs/style-guide.md`](docs/style-guide.md) | Design tokens, palette, typography, glassmorphism, animations |

---

<div align="center">

**Part of the IT-Hell project** • [Backend](../backend) • [Scrapers](../scrapers) • [Keycloak Config](../keyCloak)

Made with ❤️ in Poland

</div>
