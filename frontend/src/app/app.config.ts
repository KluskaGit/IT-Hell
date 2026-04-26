import { APP_INITIALIZER, ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { routes } from './app.routes';
import { AuthService } from '../features/auth/auth.service';
// import { UserApiService } from './core/services/user-api.service'; // odkomentuj przy włączaniu /users/sync (endpoint chroniony — Piotrek)

import { registerLocaleData } from '@angular/common';
import localePl from '@angular/common/locales/pl';

registerLocaleData(localePl);

const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  if (token && req.url.includes('/v1/')) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  return next(req);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    { provide: LOCALE_ID, useValue: 'pl' },
    {
      provide: APP_INITIALIZER,
      useFactory: (auth: AuthService) => async () => {
        const timeout = new Promise<void>(resolve => setTimeout(resolve, 5000));
        await Promise.race([auth.init(), timeout]).catch((err: unknown) => {
          console.warn('[Auth] Keycloak niedostępny — aplikacja działa bez autentykacji.', err);
        });
        // Po włączeniu /users/sync (endpoint chroniony) dodać tutaj:
        // if (auth.isLoggedIn()) { await userApi.syncUser().catch(...); }
      },
      deps: [AuthService],
      multi: true,
    },
  ]
};
