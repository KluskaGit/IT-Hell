import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import Keycloak from 'keycloak-js';
import { keycloakConfig } from '../../app/keycloak.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private keycloak: Keycloak | null = null;
  private initialized = false;
  private refreshIntervalId: number | null = null;

  isAuthenticated = signal(false);
  username = signal<string | null>(null);

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  async init(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!this.keycloak) {
      this.keycloak = new Keycloak({
        url: keycloakConfig.url,
        realm: keycloakConfig.realm,
        clientId: keycloakConfig.clientId,
      });
    }

    if (this.initialized) {
      this.updateAuthState();
      return;
    }

    await this.keycloak.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      redirectUri: window.location.href,
    });

    this.initialized = true;
    this.updateAuthState();
    this.startTokenRefresh();
  }

  private updateAuthState(): void {
    const loggedIn = !!this.keycloak?.authenticated;
    this.isAuthenticated.set(loggedIn);

    const parsed = this.keycloak?.tokenParsed as {
      preferred_username?: string;
      given_name?: string;
      family_name?: string;
      email?: string;
    } | undefined;

    this.username.set(parsed?.given_name ?? parsed?.preferred_username ?? null);
  }

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

  async login(redirectPath?: string): Promise<void> {
    if (!this.keycloak) {
      await this.init();
    }

    const redirectUri = redirectPath
      ? `${window.location.origin}${redirectPath}`
      : window.location.href;

    await this.keycloak?.login({
      redirectUri
    });
  }

  async logout(): Promise<void> {
    this.stopTokenRefresh();
    this.isAuthenticated.set(false);
    this.username.set(null);

    await this.keycloak?.logout({
      redirectUri: window.location.origin
    });
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  getUsername(): string | undefined {
    return this.username() ?? undefined;
  }

  getToken(): string | undefined {
    return this.keycloak?.token;
  }

  async refreshToken(minValidity = 30): Promise<boolean> {
    if (!this.keycloak) {
        return false;
    }

    try {
        const refreshed = await this.keycloak.updateToken(minValidity);
        this.updateAuthState();

        if (refreshed) {
        console.log('Access token został odświeżony.');
        }

        return true;
    } catch (error) {
        console.error('Nie udało się odświeżyć tokena.', error);
        this.isAuthenticated.set(false);
        this.username.set(null);
        this.stopTokenRefresh();
        return false;
    }
    }

  private startTokenRefresh(): void {
    if (!isPlatformBrowser(this.platformId)) {
        return;
    }

    if (this.refreshIntervalId !== null) {
        return;
    }

    // ===================== zmiana Marka =====================
    // bez tego guarda interval pruł błędem co 20s nawet gdy nikt nie był zalogowany
    this.refreshIntervalId = window.setInterval(async () => {
        if (!this.isLoggedIn()) return;

        const refreshed = await this.refreshToken(30);

        if (!refreshed && !this.isLoggedIn()) {
        this.username.set(null);
        }
    }, 20000);
    // ===================== zmiana Marka =====================
    }

    private stopTokenRefresh(): void {
    if (this.refreshIntervalId !== null) {
        window.clearInterval(this.refreshIntervalId);
        this.refreshIntervalId = null;
    }
    }
}