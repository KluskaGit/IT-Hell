import { bootstrapApplication } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { appConfig } from './app/app.config';
import { App } from './app/app';
import { AuthService } from './features/auth/auth.service';

async function initializeApp() {
  const appRef = await bootstrapApplication(App, appConfig);

  const authService = appRef.injector.get(AuthService);
  const platformId = appRef.injector.get(PLATFORM_ID);

  if (isPlatformBrowser(platformId)) {
    await authService.init();

    console.log('KEYCLOAK LOGGED IN:', authService.isLoggedIn());
    console.log('KEYCLOAK USER:', authService.getUsername());
    console.log('KEYCLOAK TOKEN:', authService.getToken());
  }
}

initializeApp().catch((err) => console.error(err));