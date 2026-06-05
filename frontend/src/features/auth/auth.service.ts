// Keycloak-based authentication service - the central point for handling login across the app.
// Used by almost every component that needs to know whether the user is logged in.
//
// Responsibilities:
//   1. Initialize the Keycloak client (init()) - called from app.config.ts at app startup
//   2. Log in and log out (login(), logout())
//   3. Automatically refresh the JWT every 20 seconds (startTokenRefresh / refreshToken)
//   4. Expose the auth state as Angular Signals (isAuthenticated, username)
//   5. Read data from the JWT without an API call (getProfile(), getToken())
//   6. Create the Keycloak client instance via createKeycloak() in a test-friendly way
//
// Related files:
//   keycloak.config.ts       - url, realm, clientId for the Keycloak instance
//   app.config.ts            - calls authService.init() from the APP_INITIALIZER
//   navbar.component.ts      - uses isAuthenticated() and username() for conditional UI
//   profile.component.ts     - uses getProfile() to read first/last name and email from the token
//   auth.guard.ts            - uses isAuthenticated() to protect the /profile route
//
// keycloak-js: the Keycloak client library (npm: keycloak-js).
// It talks to the Keycloak server via redirects and PKCE (not directly through a REST API).

import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import Keycloak from 'keycloak-js';
import { keycloakConfig } from '../../app/keycloak.config';

// providedIn: 'root' = application-wide singleton.
// A single AuthService instance shared by all components -
// guarantees that isAuthenticated stays consistent across the whole app
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // The keycloak-js client instance - created lazily in init() (not in the constructor).
  // null before init() and on the server (SSR)
  private keycloak: Keycloak | null = null;
  // Flag preventing multiple keycloak.init() calls - init() may be called several times
  // (e.g. on navigation), but Keycloak can only be initialized once
  private initialized = false;
  // The interval id from window.setInterval - kept so it can be cancelled in stopTokenRefresh().
  // number (not ReturnType<typeof setTimeout>) because window.setInterval always returns a number in the browser
  private refreshIntervalId: number | null = null;

  // Angular Signals - reactive auth state available to the whole app.
  // Signal instead of BehaviorSubject because it needs no subscription - read via isAuthenticated().
  // Used in templates: *ngIf="isAuthenticated()" and in the guard: authService.isAuthenticated()
  isAuthenticated = signal(false);
  // The displayed user name (given_name from the JWT, or preferred_username as a fallback).
  // null when the user is not logged in
  username = signal<string | null>(null);

  // PLATFORM_ID - Angular token identifying the runtime environment (browser/server).
  // Needed because Keycloak uses window, localStorage and cookies - unavailable in Node.js (SSR)
  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  // Initializes the Keycloak client and checks whether the user is already logged in (SSO).
  // Called from app.config.ts via the APP_INITIALIZER - blocks app startup
  // until Keycloak responds (so the guard and navbar know the state right away).
  async init(): Promise<void> {
    // Browser-only block - on the server (SSR) Keycloak makes no sense
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Lazy creation of the Keycloak instance - only once, on the first init().
    // The client construction itself is extracted into createKeycloak() to simplify
    // unit tests and allow swapping the implementation in a test subclass.
    if (!this.keycloak) {
      this.keycloak = this.createKeycloak();
    }

    // If keycloak.init() was already called earlier - just refresh the signal state.
    // Calling keycloak.init() more than once throws, hence the initialized flag
    if (this.initialized) {
      this.updateAuthState();
      return;
    }

    // The actual Keycloak initialization:
    //   onLoad: 'check-sso'   - checks whether an active SSO session exists (does not force login)
    //   pkceMethod: 'S256'     - PKCE (Proof Key for Code Exchange) - OAuth2 protection
    //                            for SPAs (no backend in the token flow)
    //   redirectUri            - the return URL after login/logout in Keycloak.
    //                            We use origin+pathname (without query params) - the Keycloak
    //                            wildcard * does not cover query parameters, so e.g.
    //                            /offers?seniority=... would be rejected as
    //                            "Invalid parameter: redirect_uri"
    try {
      await this.keycloak.init({
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        redirectUri: window.location.origin + window.location.pathname,
      });
    } catch {
      // Keycloak unavailable - the app runs in a logged-out state
    }

    this.initialized = true;
    // Update the isAuthenticated and username signals based on Keycloak's response
    this.updateAuthState();
    // Start automatically refreshing the token every 20 seconds
    this.startTokenRefresh();
  }

  // Factory for the Keycloak instance.
  // By default it creates a real keycloak-js client based on keycloak.config.ts.
  //
  // Why this is extracted into its own method instead of "new Keycloak(...)" directly in init():
  //   1. Simplifies AuthService unit tests
  //      - tests can override this method and return a mock instead of a real instance
  //      - that way there is no need to mock the "keycloak-js" import, which can be tricky
  //        in an Angular + Vitest + ESM environment
  //   2. Separates client-creation logic from session-initialization logic
  //      - init() is responsible for starting Keycloak and setting the auth state
  //      - createKeycloak() is responsible only for constructing the object
  //
  // protected instead of private:
  //   - the production app still uses the default implementation
  //   - a test subclass can override createKeycloak() and return a mock
  protected createKeycloak(): Keycloak {
    return new Keycloak({
      url: keycloakConfig.url,
      realm: keycloakConfig.realm,
      clientId: keycloakConfig.clientId,
    });
  }

  // Updates the isAuthenticated and username signals based on the current Keycloak state.
  // Called after init(), after a token refresh and after every auth operation.
  // keycloak.authenticated - boolean set by Keycloak after init()
  private updateAuthState(): void {
    const loggedIn = !!this.keycloak?.authenticated;
    this.isAuthenticated.set(loggedIn);

    // tokenParsed is the decoded JWT payload - an object with the user's claims.
    // keycloak-js does not export a full type, hence the "as" cast to our own interface.
    // Fields follow the OpenID Connect standard:
    //   preferred_username - login (always available)
    //   given_name         - first name (may be empty if not configured in Keycloak)
    //   family_name        - last name
    //   email              - email address
    const parsed = this.keycloak?.tokenParsed as {
      preferred_username?: string;
      given_name?: string;
      family_name?: string;
      email?: string;
    } | undefined;

    // given_name as the preferred display name, preferred_username as the fallback
    this.username.set(parsed?.given_name ?? parsed?.preferred_username ?? null);
  }

  // Returns the user's profile data straight from the JWT (without an API call).
  // Used by profile.component.ts in initFromToken() to immediately fill the
  // first name / last name / email fields without waiting for the backend response.
  // Returns an empty string when a field is missing from the token (a new user with no data yet)
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

  // Redirects the user to the Keycloak login page.
  // redirectPath - optional return path after login (e.g. '/profile').
  // If omitted, Keycloak returns to the current URL (window.location.href).
  async login(redirectPath?: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // Lazy initialization - in case init() has not been called yet
    if (!this.keycloak) {
      await this.init();
    }

    // Building the absolute return URL - Keycloak requires a full URL (not a relative one).
    // window.location.href is intentionally skipped - it contains query params that the
    // Keycloak wildcard does not accept; after login the filters are restored from localStorage
    const redirectUri = redirectPath
      ? `${window.location.origin}${redirectPath}`
      : window.location.origin + window.location.pathname;

    try {
      // keycloak.login() redirects the browser to the Keycloak login page.
      // After login Keycloak redirects back to redirectUri with an authorization code
      await this.keycloak?.login({ redirectUri });
    } catch { /* keycloak unavailable */ }
  }

  // Logs the user out - ends the Keycloak session and clears local state.
  // Order: 1. stop the refresh interval -> 2. keycloak.logout() -> 3. reset the signals.
  // keycloak.logout() redirects the browser to Keycloak which ends the SSO session,
  // then returns to window.location.origin (the home page)
  async logout(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // Stop refreshing the token before keycloak.logout() redirects the page
    this.stopTokenRefresh();

    try {
      // window.location.origin has no trailing slash (e.g. "http://localhost"), and the Keycloak
      // wildcard "http://localhost/*" requires a path - we add "/" so it matches the pattern
      await this.keycloak?.logout({ redirectUri: window.location.origin + '/' });
    } catch { /* keycloak unavailable */ }

    // Reset state - in case logout() did not redirect (e.g. Keycloak unavailable)
    this.isAuthenticated.set(false);
    this.username.set(null);
  }

  // Returns the username signal value as string | undefined (instead of string | null).
  // undefined instead of null - the TypeScript convention for "no value" in optional parameters
  getUsername(): string | undefined {
    return this.username() ?? undefined;
  }

  // Returns the raw JWT (string) from the Keycloak instance.
  // Used by the HTTP interceptor to add the Authorization: Bearer <token> header
  // to every request to the backend (see: app.config.ts - withInterceptors)
  getToken(): string | undefined {
    return this.keycloak?.token;
  }

  // Refreshes the JWT through Keycloak if it expires within minValidity seconds.
  // minValidity = 30 (default): refresh if the token expires within 30 seconds.
  // Keycloak.updateToken() checks validity locally (no server call if the token is still fresh).
  // Returns true = token valid (fresh or refreshed), false = refresh failed
  async refreshToken(minValidity = 30): Promise<boolean> {
    if (!this.keycloak) {
        return false;
    }

    try {
        // updateToken(minValidity) returns true if the token was actually refreshed,
        // false if it was still fresh enough (no refresh was needed)
        const refreshed = await this.keycloak.updateToken(minValidity);
        // Update the signals after refresh - the token may contain new claims
        this.updateAuthState();

        if (refreshed) {
        console.log('Access token refreshed.');
        }

        return true;
    } catch (error) {
        // Token refresh failed - the session has probably expired (the refresh token is invalid too).
        // Log the user out of the app state (without redirecting to Keycloak)
        console.error('Failed to refresh token.', error);
        this.isAuthenticated.set(false);
        this.username.set(null);
        this.stopTokenRefresh();
        return false;
    }
    }

  // Starts automatically refreshing the token every 20 seconds (20000ms).
  // Called once after a successful Keycloak initialization (init()).
  // Every 20 seconds it checks whether the token expires within 30 seconds - if so, it refreshes.
  // The 30s window gives a buffer: even if an HTTP request goes out just before expiry,
  // the token will be refreshed before the backend rejects it
  private startTokenRefresh(): void {
    if (!isPlatformBrowser(this.platformId)) {
        return;
    }

    // Guard against a duplicate interval - if one is already running, don't create a second
    if (this.refreshIntervalId !== null) {
        return;
    }

    // window.setInterval instead of setInterval - TypeScript knows this is a number (browser),
    // not NodeJS.Timeout (Node.js). Needed for correct typing of refreshIntervalId
    this.refreshIntervalId = window.setInterval(async () => {
        // Skip the refresh when the user is not logged in - there is nothing to refresh
        if (!this.isAuthenticated()) return;

        const refreshed = await this.refreshToken(30);

        // If the refresh failed and the user is no longer logged in - clear the username
        if (!refreshed && !this.isAuthenticated()) {
        this.username.set(null);
        }
    }, 20000);
    }

  // Stops the automatic token refresh and releases the interval.
  // Called on logout() and on a refresh error (session expired)
    private stopTokenRefresh(): void {
    if (this.refreshIntervalId !== null) {
        window.clearInterval(this.refreshIntervalId);
        this.refreshIntervalId = null;
    }
    }
}
