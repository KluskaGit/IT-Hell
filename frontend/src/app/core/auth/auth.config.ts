import { AuthConfig } from 'angular-oauth2-oidc';

export const authConfig: AuthConfig = {
  issuer: 'http://localhost:8080/realms/it-hell',
  redirectUri: window.location.origin,
  clientId: 'backend-client',
  responseType: 'code',
  scope: 'openid profile email',
  showDebugInformation: true,
  requireHttps: false // Przydatne tylko do dewelopmentu na localhost
};