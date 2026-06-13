// Production environment configuration.
// Swapped in for environment.ts on a production build via angular.json (fileReplacements).
export const environment = {
  apiUrl: 'https://ca-ithell-backend--0000004.wittysea-2f444ccc.swedencentral.azurecontainerapps.io/v1',
  keycloakUrl: 'https://ca-ithell-keycloak.bravesmoke-75b73f0d.polandcentral.azurecontainerapps.io',
  keycloakRealm: 'it-hell',
  keycloakClientId: 'backend-client',
};
