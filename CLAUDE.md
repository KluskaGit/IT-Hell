# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack job-matching platform: Angular 21 SSR frontend + FastAPI backend + Keycloak auth + PostgreSQL + Redis. Job offers are scraped from external sites, published to Redis, consumed by a worker, and stored in the database.

## Dev Commands

### Start everything (recommended)
```bash
docker compose up
```

### Frontend only (from `frontend/`)
```bash
npm start          # dev server on :4200, proxies /v1 → localhost:8000
npm run build      # production build
npm test           # vitest
```

### Backend only (from `backend/`)
```bash
uv sync                              # install dependencies
uv run uvicorn src.api.main:app --reload   # dev server on :8000
uv run alembic upgrade head          # run DB migrations
uv run python -m worker.main         # run job queue worker
```

## Architecture

### Request Flow
```
Browser → Angular (SSR :4200) → proxy /v1/* → FastAPI (:8000) → PostgreSQL
                                                              ↘ Redis
Scrapers → Redis stream → Worker → PostgreSQL
```

### Authentication (Keycloak)
- Realm `it-hell`, client `backend-client`, RS256 PKCE flow
- Frontend: Keycloak JS library in `auth.service.ts` — checks SSO on app init, auto-refreshes token every 20s
- HTTP interceptor in `app.config.ts` injects `Authorization: Bearer <token>` on all `/v1/` requests
- Backend: `get_current_user()` dep in `deps.py` validates JWT against Keycloak JWKS, auto-creates User row on first login

### Backend Layers
```
Routers (src/api/v1/routers/) → Services (src/services/) → Repositories (src/repositories/) → SQLAlchemy async + asyncpg
```
- Custom exceptions (`RecordNotFoundError`, `RecordAlreadyExistsError`) are mapped to HTTP status codes in `main.py`
- `User.id_keycloak` (UUID from Keycloak) is the primary key — not an auto-increment id

### Frontend Structure
- `features/` — page-level components (home, offers, profile, about, legal)
- `shared/` — reusable components (navbar, footer, filters-form, tech-picker, location-picker)
- `core/services/` — API services (one per backend domain: auth, cv, job-offers, user, lookups)
- Route guards in `core/guards/` protect `/profile`
- State via Angular signals (not NgRx)

### Key Constraints
- **Do not modify** `auth.service.ts` or `home.component.*` without explicit instruction — sensitive/shared files
- **Do not push** to `durny-branch`
- Backend changes require coordinating with the backend team — frontend-only work happens in `frontend-Marek2` or `marek-frontend-v3`
- Proxy (`proxy.conf.json`) only works with `npm start` — SSR mode needs the backend running separately

### Environment
All secrets live in `.env` at the repo root (not committed). Key values:
- Keycloak: `http://localhost:8080`, realm `it-hell`
- Backend API: `http://localhost:8000`
- DB: PostgreSQL on `localhost:5432`, default creds `postgres/1234`
