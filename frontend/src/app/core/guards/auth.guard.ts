import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../../../features/auth/auth.service';

// Chroni /profile - przekierowuje niezalogowanego do Keycloak, potem wraca na docelowy URL
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);

  if (auth.isAuthenticated()) {
    return true;
  }

  await auth.login(state.url);
  return false;
};
