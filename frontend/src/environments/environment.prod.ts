// Production environment configuration.
// Swapped in for environment.ts on a production build via angular.json (fileReplacements).
export const environment = {
  apiUrl: 'https://ca-ithell-backend--0000004.wittysea-2f444ccc.swedencentral.azurecontainerapps.io/v1',
  // Keycloak is not yet publicly deployed - placeholder until a public URL exists.
  // The app still boots without it (see app.config.ts APP_INITIALIZER timeout), but
  // login/register/profile won't work until this is updated.
  keycloakUrl: 'http://localhost:8080',
  keycloakRealm: 'it-hell',
  keycloakClientId: 'backend-client',
};
