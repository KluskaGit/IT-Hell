import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

// 1. Dodaj te dwa importy:
import { registerLocaleData } from '@angular/common';
import localePl from '@angular/common/locales/pl';

// 2. Zarejestruj język polski:
registerLocaleData(localePl);

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // 3. Upewnij się, że masz ustawiony LOCALE_ID na 'pl' w tablicy providers:
    { provide: LOCALE_ID, useValue: 'pl' }
  ]
};