# 🔧 Environment variables — Frontend

Frontend-specific configuration only (`environment.ts`, `proxy.conf.json`). The backend,
Redis, Keycloak and Docker Compose variables live at the **project root** — this file links to
them instead of repeating them. Complements the [frontend README](../README.md).

## 📑 Table of contents

- [Overview](#overview)
- [Frontend — `environment.ts`](#-frontend--environmentts)
- [Frontend — `proxy.conf.json`](#-frontend--proxyconfjson)
- [Values that must match the backend](#-values-that-must-match-the-backend)
- [Security](#-security)

---

## Overview

The project has **three configuration layers**. Only the frontend layer is documented here; the
other two are owned by the root/backend and documented there.

| Layer | File | Owner | Documented in |
|---|---|---|---|
| Backend (FastAPI) + Redis | root `.env` (from `backend/.env_template`) | backend | [root README](../../README.md), `backend/.env_template` |
| Docker Compose | `compose.yaml` + root `.env` | infra | [root README](../../README.md), `compose.yaml` |
| **Frontend (Angular)** | `frontend/src/environments/environment.ts`, `frontend/proxy.conf.json` | frontend | **this file** |

> 💡 The authoritative list of backend / Redis / Keycloak variables is `backend/.env_template`
> and `scrapers/.env_template`. The root `.env` is the single source — don't duplicate those
> values here.

---

## 🌐 Frontend — `environment.ts`

**Location:** `frontend/src/environments/environment.ts`
**Loading:** static import in services (`environment.apiUrl`, `environment.keycloakUrl`, ...).

```typescript
export const environment = {
  apiUrl: '/v1',                       // prefix for all HTTP requests
  keycloakUrl: 'http://localhost:8080',
  keycloakRealm: 'it-hell',
  keycloakClientId: 'backend-client',
};
```

| Key | Type | Default (dev) | Description |
|---|---|---|---|
| `apiUrl` | `string` | `'/v1'` | Backend endpoint prefix. In dev the proxy rewrites it to `http://localhost:8000/v1`. In Docker the nginx config proxies `/v1/` to `backend:8000`. |
| `keycloakUrl` | `string` | `'http://localhost:8080'` | Keycloak server URL (must be reachable from the browser) |
| `keycloakRealm` | `string` | `'it-hell'` | Realm name |
| `keycloakClientId` | `string` | `'backend-client'` | Public client ID for the SPA (PKCE) |

`keycloak.config.ts` maps these values into the `keycloak-js` config (`url`, `realm`, `clientId`).

### Production: swapping the file via `angular.json`

You can add `fileReplacements` so the Angular CLI swaps the file on a production build:

```json
"configurations": {
  "production": {
    "fileReplacements": [{
      "replace": "src/environments/environment.ts",
      "with":    "src/environments/environment.prod.ts"
    }]
  }
}
```

> ⚠️ `environment.prod.ts` **does not currently exist in the repo**, and `angular.json` does **not**
> define `fileReplacements` yet — add both before the first production deployment.

---

## 🔀 Frontend — `proxy.conf.json`

**Location:** `frontend/proxy.conf.json`
**Active only in dev mode** (`npm start`).

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

| Key | Description |
|---|---|
| `target` | The backend address — the Angular Dev Server rewrites `/v1/*` to this URL |
| `secure` | `false` allows proxying to non-HTTPS (local backend) |
| `changeOrigin` | Modifies the `Host` header — required when the backend checks the origin |
| `logLevel` | `debug` logs every proxied request to the `npm start` console |

In **production** this file is irrelevant. The reverse proxy (the frontend's nginx) rewrites
`/v1/*` to the backend (see `frontend/nginx.conf`).

---

## 🔗 Values that must match the backend

Three values in `environment.ts` are shared with Keycloak/the backend. If they drift apart, login
or API calls break. The authoritative values live in the root `.env` (see
[root README](../../README.md)) — here is only the mapping:

| `environment.ts` | Root `.env` key | Must match because |
|---|---|---|
| `keycloakRealm` (`it-hell`) | `KEYCLOAK_REALM_NAME` | The SPA and the backend validate tokens against the same realm |
| `keycloakClientId` (`backend-client`) | `KEYCLOAK_CLIENT_ID` | The public client the SPA logs in with |
| `keycloakUrl` (`http://localhost:8080`) | `KEYCLOAK_URL` | The browser redirects to this URL during login |

`apiUrl` (`/v1`) has no backend counterpart — it's a relative prefix resolved by the dev proxy
(`proxy.conf.json`) or nginx (`frontend/nginx.conf`).

---

## 🛡️ Security

This section covers **only the frontend** config. The `.gitignore` rules, the `.env` handling and
the secrets policy are documented in the [root README](../../README.md).

- `environment.ts` contains **no secrets** — only URLs and the realm/client id. It is safe to
  commit and is intentionally tracked in git.
- Real secrets (DB password, Keycloak admin, Redis password) belong to the root `.env`, which is
  gitignored. The frontend never reads them.
- `apiUrl` is **baked into the bundle** at build time — changing it requires a rebuild
  (`npm run build`), not just a restart.

---

## 📚 Related documents

- [root README](../../README.md) — the single source for backend/Redis/Docker/Keycloak variables
- [`README.md`](../README.md) — frontend quick-start
- [`docs/auth-flow.md`](auth-flow.md) — how the `keycloak*` values drive the login flow
- [`docs/api-services.md`](api-services.md) — `apiUrl` is used by every API service
