import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../../../features/auth/auth.service';

// Protects /profile - redirects a logged-out user to Keycloak, then returns to the target URL
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);

  if (auth.isAuthenticated()) {
    return true;
  }

  await auth.login(state.url);
  return false;
};
