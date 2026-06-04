import { describe, it, expect } from 'vitest';

import { routes } from './app.routes';
import { HomeComponent } from '../features/home/home.component';
import { ProfileComponent } from '../features/profile/profile.component';
import { OffersComponent } from '../features/offers/offers.component';
import { LegalComponent } from '../features/legal/legal.component';
import { AboutComponent } from '../features/about/about.component';
import { authGuard } from './core/guards/auth.guard';

describe('app.routes', () => {
  it('should define home route', () => {
    const route = routes.find(r => r.path === '');

    expect(route).toBeTruthy();
    expect(route?.component).toBe(HomeComponent);
  });

  it('should redirect legacy login route to home', () => {
    const route = routes.find(r => r.path === 'login');

    expect(route).toBeTruthy();
    expect(route?.redirectTo).toBe('');
    expect(route?.pathMatch).toBe('full');
  });

  it('should redirect legacy register route to home', () => {
    const route = routes.find(r => r.path === 'register');

    expect(route).toBeTruthy();
    expect(route?.redirectTo).toBe('');
    expect(route?.pathMatch).toBe('full');
  });

  it('should redirect legacy forgot-password route to home', () => {
    const route = routes.find(r => r.path === 'forgot-password');

    expect(route).toBeTruthy();
    expect(route?.redirectTo).toBe('');
    expect(route?.pathMatch).toBe('full');
  });

  it('should define guarded profile route', () => {
    const route = routes.find(r => r.path === 'profile');

    expect(route).toBeTruthy();
    expect(route?.component).toBe(ProfileComponent);
    expect(route?.canActivate).toEqual([authGuard]);
  });

  it('should define offers route', () => {
    const route = routes.find(r => r.path === 'offers');

    expect(route).toBeTruthy();
    expect(route?.component).toBe(OffersComponent);
  });

  it('should define legal route', () => {
    const route = routes.find(r => r.path === 'legal');

    expect(route).toBeTruthy();
    expect(route?.component).toBe(LegalComponent);
  });

  it('should define about route', () => {
    const route = routes.find(r => r.path === 'about');

    expect(route).toBeTruthy();
    expect(route?.component).toBe(AboutComponent);
  });

  it('should define wildcard redirect to home', () => {
    const route = routes.find(r => r.path === '**');

    expect(route).toBeTruthy();
    expect(route?.redirectTo).toBe('');
  });

    it('should contain exactly 9 routes', () => {
    expect(routes).toHaveLength(9);
    });
});