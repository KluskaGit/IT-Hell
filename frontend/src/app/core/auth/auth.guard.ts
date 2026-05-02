import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  
  if (authService.hasValidToken()) {
    return true;
  }
  
  // Zabezpieczenie przed niezalogowanymi użytkonikami w Panelu
  authService.login();
  return false;
};