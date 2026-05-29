# 🔧 Zmienne środowiskowe — CV_ANALIZER

Pełna referencja wszystkich zmiennych konfiguracyjnych używanych w projekcie. Uzupełnienie [głównego README](../README.md) i [`docs/deployment.md`](deployment.md) (TBD).

## 📑 Spis treści

- [Przegląd](#przegląd)
- [Backend — plik `.env`](#-backend--plik-env)
- [Frontend — `environment.ts`](#-frontend--environmentts)
- [Frontend — `proxy.conf.json`](#-frontend--proxyconfjson)
- [Docker Compose](#-docker-compose)
- [Keycloak Admin](#-keycloak-admin)
- [Przykładowy `.env.example`](#-przykładowy-envexample)
- [Bezpieczeństwo](#-bezpieczeństwo)

---

## Przegląd

Aplikacja ma **trzy warstwy konfiguracji**, z których każda używa innego mechanizmu:

| Warstwa | Plik | Format | Wczytywanie |
|---|---|---|---|
| Backend (FastAPI) | `.env` w katalogu głównym | `KEY=VALUE` | `pydantic-settings` (`BaseSettings`) |
| Frontend (Angular) | `frontend/src/environments/environment.ts` | TypeScript const | Import statyczny, podmiana przez `angular.json` przy buildzie produkcyjnym |
| Docker Compose | `compose.yaml` + `.env` | YAML + ENV interpolation | `${VAR}` w YAML, wartości z `.env` |

---

## 🗄️ Backend — plik `.env`

**Lokalizacja:** katalog główny projektu (`IT-Hell/.env`)
**Wczytywanie:** `backend/src/core/settings.py` przez `pydantic_settings.BaseSettings` z `model_config = SettingsConfigDict(env_file=".env")`

### PostgreSQL

| Zmienna | Typ | Domyślna | Opis |
|---|---|---|---|
| `POSTGRES_USER` | `str` | — | Użytkownik bazy danych (np. `postgres`) |
| `POSTGRES_PASSWORD` | `str` | — | Hasło użytkownika bazy |
| `POSTGRES_HOST` | `str` | — | Hostname kontenera PostgreSQL (w Dockerze: `database`) |
| `POSTGRES_PORT` | `int` | — | Port PostgreSQL (zwykle `5432`) |
| `POSTGRES_DB` | `str` | — | Nazwa bazy danych (np. `postgres`) |

> 💡 W Docker Compose `POSTGRES_HOST=database` (nazwa serwisu), a nie `localhost`. Backend łączy się przez wewnętrzną sieć Dockera (`app-network`).

### Keycloak

| Zmienna | Typ | Domyślna | Opis |
|---|---|---|---|
| `KEYCLOAK_URL` | `str` | `http://localhost:8080` | Bazowy URL serwera Keycloak |
| `KEYCLOAK_REALM_NAME` | `str` | — | Nazwa realmu (`it-hell`) |
| `KEYCLOAK_CLIENT_ID` | `str` | — | Public client ID dla SPA (`backend-client`) |
| `KEYCLOAK_ALGORITHM` | `str` | — | Algorytm podpisu JWT (`RS256`) |

### Redis

| Zmienna | Typ | Domyślna | Opis |
|---|---|---|---|
| `REDIS_HOST` | `str` | — | Hostname kontenera Redis (`message-broker`) |
| `REDIS_PORT` | `int` | — | Port Redis (zwykle `6379`) |
| `REDIS_DB` | `int` | `0` | Numer logicznej bazy Redis |
| `REDIS_PASSWORD` | `str \| None` | `None` | Hasło Redis (puste w dev, ustaw w prod) |
| `REDIS_STREAM` | `str` | — | Nazwa stream'a (np. `test-stream`) — kolejka zadań |
| `REDIS_GROUP` | `str` | — | Consumer group (np. `backend`) |
| `REDIS_CONSUMER` | `str` | — | Nazwa konsumenta (np. `backend-1`) |

---

## 🌐 Frontend — `environment.ts`

**Lokalizacja:** `frontend/src/environments/environment.ts`
**Wczytywanie:** import statyczny w serwisach (`environment.apiUrl`, `environment.keycloakUrl`, ...).

```typescript
export const environment = {
  apiUrl: '/v1',                       // prefix wszystkich żądań HTTP
  keycloakUrl: 'http://localhost:8080',
  keycloakRealm: 'it-hell',
  keycloakClientId: 'backend-client',
};
```

| Klucz | Typ | Domyślna (dev) | Opis |
|---|---|---|---|
| `apiUrl` | `string` | `'/v1'` | Prefix endpointów backendu. W dev proxy przepisuje na `http://localhost:8000/v1`. W prod ustaw na pełen URL (np. `https://api.example.com/v1`). |
| `keycloakUrl` | `string` | `'http://localhost:8080'` | URL serwera Keycloak (musi być dostępny z przeglądarki) |
| `keycloakRealm` | `string` | `'it-hell'` | Nazwa realmu — **musi pasować** do `KEYCLOAK_REALM_NAME` w backendzie |
| `keycloakClientId` | `string` | `'backend-client'` | Public client ID — **musi pasować** do `KEYCLOAK_CLIENT_ID` |

### Produkcja: podmiana pliku przez `angular.json`

W `angular.json` można dodać `fileReplacements` aby przy buildzie produkcyjnym Angular CLI podmienił plik na produkcyjny:

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

> ⚠️ Plik `environment.prod.ts` **nie istnieje obecnie w repo** — do dodania przed pierwszym deploymentem produkcyjnym.

---

## 🔀 Frontend — `proxy.conf.json`

**Lokalizacja:** `frontend/proxy.conf.json`
**Aktywny tylko w trybie dev** (`npm start`).

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

| Klucz | Opis |
|---|---|
| `target` | Adres backendu — Angular Dev Server przepisuje `/v1/*` na ten URL |
| `secure` | `false` pozwala na proxy do nie-HTTPS (lokalny backend) |
| `changeOrigin` | Modyfikuje nagłówek `Host` — wymagane gdy backend sprawdza origin |
| `logLevel` | `debug` loguje każde przepięte żądanie do konsoli `npm start` |

W **produkcji** ten plik nie ma znaczenia. Reverse proxy (nginx/Traefik) musi sam przepisać `/v1/*` na backend.

---

## 🐳 Docker Compose

**Lokalizacja:** `compose.yaml` w katalogu głównym
**Wczytywanie:** `${VAR}` interpoluje wartości z `.env` (ten sam plik co backend)

### Mapowane porty hosta

| Serwis | Port w kontenerze | Port na hoście | Cel |
|---|---|---|---|
| `database` (PostgreSQL) | `${POSTGRES_PORT}` | `${POSTGRES_PORT}` | Dostęp z hosta (DB tools, debugging) |
| `keycloak` | `8080` | `127.0.0.1:8080` | Admin Console + endpointy auth |
| `backend` (FastAPI) | `8000` | `8000` | API + Swagger `/docs` |
| `message-broker` (Redis) | `${REDIS_PORT}` | — | Tylko wewnętrzny (`app-network`) |
| `worker` | — | — | Konsumer Redis stream |
| `scrapers` | — | — | Scrapery ofert pracy |

> 💡 Keycloak jest mapowany na `127.0.0.1:8080` (loopback), nie `0.0.0.0:8080` — niedostępny z zewnątrz hosta.

### Keycloak admin credentials

Hardcoded w `compose.yaml` (TYLKO DLA DEV):

```yaml
environment:
  - KC_BOOTSTRAP_ADMIN_USERNAME=admin
  - KC_BOOTSTRAP_ADMIN_PASSWORD=admin
```

> 🛡️ **W produkcji** te wartości muszą pochodzić z `.env` lub menedżera sekretów (Docker Secrets, HashiCorp Vault).

### Volumes (dane perzystentne)

| Volume | Co przechowuje | Wpływ usunięcia |
|---|---|---|
| `db-data` | Cała baza PostgreSQL | Reset DB — `migrations` uruchomi się od zera |
| `keycloak-data` | Realm `it-hell`, użytkownicy, sesje | Reset auth — realm zostanie zaimportowany ponownie z JSON |

Usunięcie obu: `docker compose down -v`. ⚠️ Tracisz **wszystkich userów Keycloaka i wszystkie oferty z DB**.

### Auto-import realmu Keycloak

Keycloak startuje z `start-dev --import-realm` i mountuje katalog z plikiem realmu:

```yaml
keycloak:
  command: start-dev --import-realm
  volumes:
    - keycloak-data:/opt/keycloak/data
    - ./keyCloak/themes:/opt/keycloak/themes
    - ./keyCloak/import:/opt/keycloak/data/import:ro
```

Plik `keyCloak/import/it-hell-realm.json` zawiera kompletną konfigurację realmu (klient `backend-client` z PKCE S256, dozwolone redirect URIs dla `:80` i `:4200`, role, mappery JWT). Import odbywa się **automatycznie przy pierwszym starcie** — żaden krok ręczny nie jest potrzebny.

> ⚠️ Import działa **tylko gdy volume `keycloak-data` nie istnieje**. Po pierwszym uruchomieniu Keycloak silent-skip kolejne importy. Żeby wymusić ponowny import (np. po zmianie URL-i w JSON):
>
> ```bash
> docker compose down -v
> docker compose up -d --build
> ```

### Healthchecki

| Serwis | Test | Interval | Start period |
|---|---|---|---|
| `database` | `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB` | 5 s | 5 s |
| `backend` | `python urllib` → `GET /docs` → 200 | 5 s | 10 s |
| `frontend` | `wget --spider http://localhost/` | 10 s | 5 s |

Dzięki `depends_on: condition: service_healthy` kolejność startu wymuszona:

```
database → migrations (exit 0) → backend (healthy) → frontend
```

Backend startuje **dopiero gdy DB jest gotowa** i migracje przeszły. Frontend startuje **dopiero gdy backend zwraca 200 na `/docs`**. Eliminuje to race conditions typu „start ≠ ready" — żadnych 502 Bad Gateway na początku.

---

## 🔐 Keycloak Admin

Wartości używane przez Keycloak Admin Console (`http://localhost:8080`):

| Pole | Wartość (dev) |
|---|---|
| Username | `admin` |
| Password | `admin` |
| Realm | `it-hell` (po imporcie) |
| Public client | `backend-client` |
| Flow | OAuth 2.0 Authorization Code + PKCE S256 |
| Token expiry | 5 min (default) |

Konfiguracja realmu jest w `keyCloak/import/it-hell-realm.json` (mountowana do kontenera Keycloak przy starcie).

> ⚠️ **Zmiana realmu po pierwszym starcie:** edycja JSON **nie ma efektu** dopóki nie zrobisz `docker compose down -v` (wipe volume). Alternatywa: modyfikuj przez Admin Console + REST API (zmiany od razu, ale nie persystują w repo).

---

## 📄 Przykładowy `.env.example`

Zalecane jest utworzenie pliku **`.env.example`** w katalogu głównym z placeholderami (BEZ prawdziwych wartości) — łatwiej nowym osobom skonfigurować projekt:

```env
# === PostgreSQL ===
POSTGRES_USER=postgres
POSTGRES_PASSWORD=changeme
POSTGRES_HOST=database
POSTGRES_PORT=5432
POSTGRES_DB=postgres

# === Keycloak ===
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM_NAME=it-hell
KEYCLOAK_CLIENT_ID=backend-client
KEYCLOAK_ALGORITHM=RS256

# === Redis ===
REDIS_HOST=message-broker
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
REDIS_STREAM=test-stream
REDIS_GROUP=backend
REDIS_CONSUMER=backend-1
```

Pierwsze uruchomienie:

```bash
cp .env.example .env       # Linux/macOS
copy .env.example .env     # Windows cmd
Copy-Item .env.example .env  # PowerShell

# Edytuj .env i zmień hasła
docker compose up -d --build
```

---

## 🛡️ Bezpieczeństwo

### Co MUSI być w `.gitignore`

```
.env
.env.local
.env.production
.env.*.local
```

### Co MOŻE być w repo

- `.env.example` — placeholdery, bez prawdziwych haseł
- `frontend/src/environments/environment.ts` — bo nie zawiera sekretów (tylko URL i realm)
- `compose.yaml` — bo używa interpolacji z `.env`, sam nie zawiera sekretów

### Czego NIE wolno commitować

- `.env` z prawdziwymi hasłami
- Service account keys / JSON credentials
- Klucze prywatne RSA, SSL certyfikaty
- Klucze API zewnętrznych usług (Google OAuth, GitHub OAuth)
- Pliki dumpu bazy danych

### Produkcyjne zmiany konfiguracji

| Co | Działanie |
|---|---|
| Zmiana hasła PostgreSQL | Restart `database` + `backend` (nowe hasło wymaga nowego connection string) |
| Zmiana realmu Keycloak | Admin Console (zmiana JSON wymaga `down -v`) |
| Zmiana `apiUrl` frontendu | Re-build (`npm run build`) — wartość zostaje zahardcodowana w bundle |
| Zmiana `proxy.conf.json` | Restart `npm start` (dev only) |

---

## 📚 Powiązane dokumenty

- [`README.md`](../README.md) — sekcja „Pierwsze uruchomienie" odwołuje się do tych zmiennych
- [`docs/auth-flow.md`](auth-flow.md) — jak `KEYCLOAK_*` zmienne wpływają na flow logowania
- [`docs/api-services.md`](api-services.md) — `apiUrl` używany przez wszystkie serwisy API
