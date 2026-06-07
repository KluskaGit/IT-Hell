// Development environment configuration.
// Intended to be swapped for environment.prod.ts on a production build via
// angular.json (fileReplacements) - neither the prod file nor that config exist yet
// (add both before the first deployment, see the README "Configuration" section).
export const environment = {
  apiUrl: '/v1',                       // backend URL prefix - in dev the proxy rewrites it to http://localhost:8000
  keycloakUrl: 'http://localhost:8080',
  keycloakRealm: 'it-hell',
  keycloakClientId: 'backend-client',
};
