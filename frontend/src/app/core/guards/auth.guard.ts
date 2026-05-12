import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../../../features/auth/auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);

  await auth.init();

  if (auth.isLoggedIn()) {
    return true;
  }

  await auth.login(state.url);
  return false;
};