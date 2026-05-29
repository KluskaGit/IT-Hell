// Serwis autoryzacji oparty na Keycloak - centralny punkt obsługi logowania w aplikacji.
// Używany przez niemal wszystkie komponenty które potrzebują wiedzieć czy użytkownik jest zalogowany.
//
// Odpowiada za:
//   1. Inicjalizację klienta Keycloak (init()) - wywoływana z app.config.ts przy starcie aplikacji
//   2. Logowanie i wylogowanie (login(), logout())
//   3. Automatyczne odświeżanie tokenu JWT co 20 sekund (startTokenRefresh / refreshToken)
//   4. Eksponowanie stanu autoryzacji jako Angular Signal (isAuthenticated, username)
//   5. Odczyt danych z tokenu JWT bez wywołania API (getProfile(), getToken())
//
// Powiązane pliki:
//   keycloak.config.ts       - url, realm, clientId dla instancji Keycloak
//   app.config.ts            - wywołanie authService.init() w provideAppInitializer()
//   navbar.component.ts      - używa isAuthenticated() i username() do warunkowego UI
//   profile.component.ts     - używa getProfile() do odczytu imienia/nazwiska/emaila z tokenu
//   auth.guard.ts            - używa isAuthenticated() do ochrony trasy /profile
//
// Keycloak-js: biblioteka kliencka Keycloak (npm: keycloak-js).
// Komunikuje się z serwerem Keycloak przez przekierowania i PKCE (nie przez API REST bezpośrednio).

import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import Keycloak from 'keycloak-js';
import { keycloakConfig } from '../../app/keycloak.config';

// providedIn: 'root' = singleton na poziomie całej aplikacji.
// Jeden egzemplarz AuthService współdzielony przez wszystkie komponenty -
// gwarantuje że stan isAuthenticated jest spójny w całej aplikacji
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Instancja klienta Keycloak-js - tworzona leniwie w init() (nie w konstruktorze).
  // null przed init() i na serwerze (SSR)
  private keycloak: Keycloak | null = null;
  // Flaga zapobiegająca wielokrotnemu wywołaniu keycloak.init() - init() może być
  // wywołany kilka razy (np. przy nawigacji), ale Keycloak może być zainicjowany tylko raz
  private initialized = false;
  // ID interwału z window.setInterval - przechowywany żeby móc go anulować w stopTokenRefresh().
  // number (nie ReturnType<typeof setTimeout>) bo to window.setInterval, zawsze zwraca number w przeglądarce
  private refreshIntervalId: number | null = null;

  // Angular Signals - reaktywny stan autoryzacji dostępny dla całej aplikacji.
  // Signal zamiast BehaviorSubject bo nie wymaga subskrypcji - odczyt przez isAuthenticated().
  // Używany w szablonach: *ngIf="isAuthenticated()" i w guard: authService.isAuthenticated()
  isAuthenticated = signal(false);
  // Wyświetlana nazwa użytkownika (given_name z tokenu JWT lub preferred_username jako fallback).
  // null gdy użytkownik niezalogowany
  username = signal<string | null>(null);

  // PLATFORM_ID - token Angular identyfikujący środowisko uruchomienia (browser/server).
  // Potrzebny bo Keycloak używa window, localStorage i cookies - niedostępnych w Node.js (SSR)
  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  // Inicjalizuje klienta Keycloak i sprawdza czy użytkownik jest już zalogowany (SSO).
  // Wywoływana w app.config.ts przez provideAppInitializer() - blokuje start aplikacji
  // dopóki Keycloak nie odpowie (żeby guard i navbar wiedziały o stanie od razu).
  async init(): Promise<void> {
    // Blok tylko dla przeglądarki - na serwerze (SSR) Keycloak nie ma sensu
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Leniwe tworzenie instancji Keycloak - tylko raz, przy pierwszym init().
    // Konfiguracja pobierana z keycloak.config.ts (url serwera, realm, clientId)
    if (!this.keycloak) {
      this.keycloak = new Keycloak({
        url: keycloakConfig.url,
        realm: keycloakConfig.realm,
        clientId: keycloakConfig.clientId,
      });
    }

    // Jeśli keycloak.init() był już wywołany wcześniej - tylko aktualizuj stan sygnałów.
    // Wielokrotne wywołanie keycloak.init() rzuca błąd, stąd flaga initialized
    if (this.initialized) {
      this.updateAuthState();
      return;
    }

    // Właściwa inicjalizacja Keycloak:
    //   onLoad: 'check-sso'   - sprawdza czy istnieje aktywna sesja SSO (nie wymaga logowania)
    //   pkceMethod: 'S256'     - PKCE (Proof Key for Code Exchange) - zabezpieczenie OAuth2
    //                            dla aplikacji SPA (brak backendu w przepływie tokenu)
    //   redirectUri            - adres powrotu po zalogowaniu/wylogowaniu w Keycloak
    await this.keycloak.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      redirectUri: window.location.href,
    });

    this.initialized = true;
    // Aktualizacja sygnałów isAuthenticated i username na podstawie odpowiedzi Keycloak
    this.updateAuthState();
    // Uruchomienie automatycznego odświeżania tokenu co 20 sekund
    this.startTokenRefresh();
  }

  // Aktualizuje sygnały isAuthenticated i username na podstawie aktualnego stanu Keycloak.
  // Wywoływana po init(), po refresh tokenu i po każdej operacji auth.
  // keycloak.authenticated - boolean ustawiony przez Keycloak po init()
  private updateAuthState(): void {
    const loggedIn = !!this.keycloak?.authenticated;
    this.isAuthenticated.set(loggedIn);

    // tokenParsed to zdekodowany payload JWT - obiekt z claims użytkownika.
    // Keycloak-js nie eksportuje pełnego typu, dlatego rzutowanie przez "as" na własny interfejs.
    // Pola zgodne ze standardem OpenID Connect:
    //   preferred_username - login (zawsze dostępny)
    //   given_name         - imię (może być puste jeśli nie skonfigurowane w Keycloak)
    //   family_name        - nazwisko
    //   email              - adres email
    const parsed = this.keycloak?.tokenParsed as {
      preferred_username?: string;
      given_name?: string;
      family_name?: string;
      email?: string;
    } | undefined;

    // given_name jako preferowana nazwa wyświetlana, preferred_username jako fallback
    this.username.set(parsed?.given_name ?? parsed?.preferred_username ?? null);
  }

  // Zwraca dane profilu użytkownika bezpośrednio z tokenu JWT (bez wywołania API).
  // Używane przez profile.component.ts w initFromToken() do natychmiastowego wypełnienia
  // pól imię/nazwisko/email bez oczekiwania na odpowiedź backendu.
  // Zwraca pusty string gdy pole nie istnieje w tokenie (nowy użytkownik bez uzupełnionych danych)
  getProfile(): { firstName: string; lastName: string; email: string } {
    const parsed = this.keycloak?.tokenParsed as {
      given_name?: string;
      family_name?: string;
      email?: string;
    } | undefined;
    return {
      firstName: parsed?.given_name ?? '',
      lastName: parsed?.family_name ?? '',
      email: parsed?.email ?? '',
    };
  }

  // Przekierowuje użytkownika do strony logowania Keycloak.
  // redirectPath - opcjonalna ścieżka powrotu po zalogowaniu (np. '/profile').
  // Jeśli nie podana, Keycloak wróci na aktualny URL (window.location.href).
  async login(redirectPath?: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // Leniwa inicjalizacja - jeśli init() nie był jeszcze wywołany
    if (!this.keycloak) {
      await this.init();
    }

    // Budowanie absolutnego URL powrotu - Keycloak wymaga pełnego URL (nie relatywnego)
    const redirectUri = redirectPath
      ? `${window.location.origin}${redirectPath}`
      : window.location.href;

    try {
      // keycloak.login() przekierowuje przeglądarkę na stronę logowania Keycloak.
      // Po zalogowaniu Keycloak przekierowuje z powrotem na redirectUri z kodem autoryzacyjnym
      await this.keycloak?.login({ redirectUri });
    } catch { /* keycloak unavailable */ }
  }

  // Wylogowuje użytkownika - kończy sesję Keycloak i czyści stan lokalny.
  // Kolejność: 1. stop refresh interval -> 2. keycloak.logout() -> 3. reset sygnałów.
  // keycloak.logout() przekierowuje przeglądarkę do Keycloak który kończy sesję SSO,
  // potem wraca na window.location.origin (strona główna)
  async logout(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // Zatrzymanie odświeżania tokenu zanim keycloak.logout() przekieruje stronę
    this.stopTokenRefresh();

    try {
      await this.keycloak?.logout({ redirectUri: window.location.origin });
    } catch { /* keycloak unavailable */ }

    // Reset stanu - na wypadek gdyby logout() nie przekierował (np. Keycloak niedostępny)
    this.isAuthenticated.set(false);
    this.username.set(null);
  }

  // Zwraca username z sygnału jako string | undefined (zamiast string | null).
  // undefined zamiast null - konwencja TypeScript dla "brak wartości" w opcjonalnych parametrach
  getUsername(): string | undefined {
    return this.username() ?? undefined;
  }

  // Zwraca surowy token JWT (string) z instancji Keycloak.
  // Używany przez HTTP interceptor do dodania nagłówka Authorization: Bearer <token>
  // w każdym żądaniu do backendu (patrz: app.config.ts - withInterceptors)
  getToken(): string | undefined {
    return this.keycloak?.token;
  }

  // Odświeża token JWT przez Keycloak jeśli wygaśnie w ciągu minValidity sekund.
  // minValidity = 30 (domyślnie): odśwież jeśli token wygasa w ciągu 30 sekund.
  // Keycloak.updateToken() sprawdza ważność lokalnie (bez wywołania serwera jeśli token świeży).
  // Zwraca true = token ważny (świeży lub odświeżony), false = nie udało się odświeżyć
  async refreshToken(minValidity = 30): Promise<boolean> {
    if (!this.keycloak) {
        return false;
    }

    try {
        // updateToken(minValidity) zwraca true jeśli token był faktycznie odświeżony,
        // false jeśli był jeszcze wystarczająco świeży (nie trzeba było odświeżać)
        const refreshed = await this.keycloak.updateToken(minValidity);
        // Aktualizacja sygnałów po odświeżeniu - token może zawierać nowe claims
        this.updateAuthState();

        if (refreshed) {
        console.log('Access token refreshed.');
        }

        return true;
    } catch (error) {
        // Błąd refresh tokenu - sesja prawdopodobnie wygasła (refresh token też nieważny).
        // Wylogowanie użytkownika ze stanu aplikacji (bez przekierowania do Keycloak)
        console.error('Failed to refresh token.', error);
        this.isAuthenticated.set(false);
        this.username.set(null);
        this.stopTokenRefresh();
        return false;
    }
    }

  // Uruchamia automatyczne odświeżanie tokenu co 20 sekund (20000ms).
  // Wywoływana raz po udanej inicjalizacji Keycloak (init()).
  // Co 20 sekund sprawdza czy token wygaśnie w ciągu 30 sekund - jeśli tak, odświeża.
  // Okno 30s daje zapas czasu: nawet jeśli request HTTP wychodzi tuż przed wygaśnięciem,
  // token zdąży być odświeżony zanim backend go odrzuci
  private startTokenRefresh(): void {
    if (!isPlatformBrowser(this.platformId)) {
        return;
    }

    // Guard przed podwójnym interwałem - jeśli już działa, nie tworzymy drugiego
    if (this.refreshIntervalId !== null) {
        return;
    }

    // window.setInterval zamiast setInterval - TypeScript wie że to number (przeglądarka),
    // nie NodeJS.Timeout (Node.js). Potrzebne dla prawidłowego typowania refreshIntervalId
    this.refreshIntervalId = window.setInterval(async () => {
        // Guard prevents interval errors when no user is logged in
        // Pomijamy refresh gdy użytkownik nie jest zalogowany - nie ma co odświeżać
        if (!this.isAuthenticated()) return;

        const refreshed = await this.refreshToken(30);

        // Jeśli refresh się nie powiódł i użytkownik nie jest już zalogowany - czyść username
        if (!refreshed && !this.isAuthenticated()) {
        this.username.set(null);
        }
    }, 20000);
    }

  // Zatrzymuje automatyczne odświeżanie tokenu i zwalnia interwał.
  // Wywoływana przy logout() i przy błędzie refresh (sesja wygasła)
    private stopTokenRefresh(): void {
    if (this.refreshIntervalId !== null) {
        window.clearInterval(this.refreshIntervalId);
        this.refreshIntervalId = null;
    }
    }
}
