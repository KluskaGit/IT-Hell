import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { authGuard } from './auth.guard';
import { AuthService } from '../../../features/auth/auth.service';

describe('authGuard', () => {
  let isAuthenticatedSpy: ReturnType<typeof vi.fn>;
  let loginSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    isAuthenticatedSpy = vi.fn();
    loginSpy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: isAuthenticatedSpy,
            login: loginSpy,
          },
        },
      ],
    });
  });

  it('should allow access when user is authenticated', async () => {
    isAuthenticatedSpy.mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/profile' } as any)
    );

    expect(result).toBe(true);
    expect(isAuthenticatedSpy).toHaveBeenCalled();
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it('should call login with target url and deny access when user is not authenticated', async () => {
    isAuthenticatedSpy.mockReturnValue(false);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/profile' } as any)
    );

    expect(result).toBe(false);
    expect(isAuthenticatedSpy).toHaveBeenCalled();
    expect(loginSpy).toHaveBeenCalledTimes(1);
    expect(loginSpy).toHaveBeenCalledWith('/profile');
  });

  it('should pass the actual requested url to login', async () => {
    isAuthenticatedSpy.mockReturnValue(false);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/offers?tech=angular' } as any)
    );

    expect(result).toBe(false);
    expect(loginSpy).toHaveBeenCalledTimes(1);
    expect(loginSpy).toHaveBeenCalledWith('/offers?tech=angular');
  });
});