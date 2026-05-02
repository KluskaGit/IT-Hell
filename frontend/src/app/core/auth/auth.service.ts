import { Injectable, inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { authConfig } from './auth.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private oauthService = inject(OAuthService);

  constructor() {
    this.configure();
  }

  private configure() {
    this.oauthService.configure(authConfig);
    // Konfiguracja do silent refreshu (odświeżania tokena w tle za pomocą iframa)
    this.oauthService.setupAutomaticSilentRefresh();
    // Pobranie konfiguracji OIDC docelowej z Keycloaka i obsługa odpowiedzi po logowaniu
    this.oauthService.loadDiscoveryDocumentAndTryLogin();
  }

  public login() {
    this.oauthService.initCodeFlow();
  }

  public logout() {
    this.oauthService.logOut();
  }

  public get identityClaims(): any {
    return this.oauthService.getIdentityClaims();
  }

  public hasValidToken(): boolean {
    return this.oauthService.hasValidAccessToken();
  }

  public get accessToken(): string {
    return this.oauthService.getAccessToken();
  }
}