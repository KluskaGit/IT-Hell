// Konfiguracja srodowiska developerskiego.
// W produkcji ten plik jest podmieniany przez angular.json (fileReplacements).
export const environment = {
  apiUrl: '/v1',                       // prefix URL backendu - w dev proxy przepisuje na http://localhost:8000
  keycloakUrl: 'http://localhost:8080',
  keycloakRealm: 'it-hell',
  keycloakClientId: 'backend-client',
};
