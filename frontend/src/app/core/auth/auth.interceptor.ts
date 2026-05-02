import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // Dodajemy token tylko dla zapytań idących do naszego FastAPI (zależnie od środowiska: local / prod)
  if (req.url.startsWith(environment.apiUrl) && authService.hasValidToken()) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', 'Bearer ' + authService.accessToken)
    });
    return next(authReq);
  }

  // Wypchnięcie oryginalnego żądania bez tokenu (np. do zewnętrznych serwisów / obrazków)
  return next(req);
};