import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { AuthService } from './auth.service';
import { keycloakConfig } from '../../app/keycloak.config';

describe('AuthService', () => {
  let service: AuthService;

  let setIntervalSpy: ReturnType<typeof vi.spyOn>;
  let clearIntervalSpy: ReturnType<typeof vi.spyOn>;

  const keycloakInstanceMock = {
    init: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    updateToken: vi.fn(),
    authenticated: false,
    tokenParsed: undefined as any,
    token: undefined as string | undefined,
  };

  class TestAuthService extends AuthService {
    protected override createKeycloak(): any {
      return keycloakInstanceMock;
    }
  }

  beforeEach(() => {
    vi.clearAllMocks();

    keycloakInstanceMock.init.mockResolvedValue(true);
    keycloakInstanceMock.login.mockResolvedValue(undefined);
    keycloakInstanceMock.logout.mockResolvedValue(undefined);
    keycloakInstanceMock.updateToken.mockResolvedValue(false);
    keycloakInstanceMock.authenticated = false;
    keycloakInstanceMock.tokenParsed = undefined;
    keycloakInstanceMock.token = undefined;

    setIntervalSpy = vi.spyOn(window, 'setInterval').mockImplementation(() => 123 as any);
    clearIntervalSpy = vi.spyOn(window, 'clearInterval').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useClass: TestAuthService },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('init should do nothing on server platform', async () => {
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useClass: TestAuthService },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    const serverService = TestBed.inject(AuthService);

    await serverService.init();

    expect(serverService.isAuthenticated()).toBe(false);
    expect(serverService.username()).toBeNull();
    expect(keycloakInstanceMock.init).not.toHaveBeenCalled();
  });

  it('init should create Keycloak, initialize it and update auth state', async () => {
    keycloakInstanceMock.authenticated = true;
    keycloakInstanceMock.tokenParsed = {
      given_name: 'Jan',
      preferred_username: 'jan.k',
      family_name: 'Kowalski',
      email: 'jan@example.com',
    };
    keycloakInstanceMock.token = 'token-123';

    await service.init();

    expect(keycloakInstanceMock.init).toHaveBeenCalledTimes(1);
    expect(keycloakInstanceMock.init).toHaveBeenCalledWith({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      redirectUri: window.location.href,
    });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.username()).toBe('Jan');
    expect(service.getUsername()).toBe('Jan');
    expect(service.getToken()).toBe('token-123');

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 20000);
  });

  it('init should not reinitialize Keycloak on second call', async () => {
    keycloakInstanceMock.authenticated = true;
    keycloakInstanceMock.tokenParsed = {
      preferred_username: 'jan.k',
    };

    await service.init();
    await service.init();

    expect(keycloakInstanceMock.init).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.username()).toBe('jan.k');
  });

  it('getProfile should return data from tokenParsed', async () => {
    keycloakInstanceMock.authenticated = true;
    keycloakInstanceMock.tokenParsed = {
      given_name: 'Anna',
      family_name: 'Nowak',
      email: 'anna@example.com',
    };

    await service.init();

    expect(service.getProfile()).toEqual({
      firstName: 'Anna',
      lastName: 'Nowak',
      email: 'anna@example.com',
    });
  });

  it('getProfile should return empty strings when tokenParsed is missing', () => {
    expect(service.getProfile()).toEqual({
      firstName: '',
      lastName: '',
      email: '',
    });
  });

  it('login should lazy-init keycloak and call login with redirectPath', async () => {
    await service.login('/profile');

    expect(keycloakInstanceMock.init).toHaveBeenCalledTimes(1);
    expect(keycloakInstanceMock.login).toHaveBeenCalledTimes(1);
    expect(keycloakInstanceMock.login).toHaveBeenCalledWith({
      redirectUri: `${window.location.origin}/profile`,
    });
  });

  it('login should use current location href when redirectPath is not provided', async () => {
    await service.login();

    expect(keycloakInstanceMock.login).toHaveBeenCalledWith({
      redirectUri: window.location.href,
    });
  });

  it('logout should call keycloak logout, stop refresh and reset auth state', async () => {
    keycloakInstanceMock.authenticated = true;
    keycloakInstanceMock.tokenParsed = {
      given_name: 'Jan',
    };

    await service.init();

    expect(service.isAuthenticated()).toBe(true);
    expect(service.username()).toBe('Jan');

    await service.logout();

    expect(keycloakInstanceMock.logout).toHaveBeenCalledTimes(1);
    expect(keycloakInstanceMock.logout).toHaveBeenCalledWith({
      redirectUri: window.location.origin,
    });
    expect(clearIntervalSpy).toHaveBeenCalledWith(123);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.username()).toBeNull();
  });

  it('refreshToken should return true and update auth state on success', async () => {
    keycloakInstanceMock.authenticated = true;
    keycloakInstanceMock.tokenParsed = {
      given_name: 'Jan',
      preferred_username: 'jan.k',
    };

    await service.init();

    keycloakInstanceMock.tokenParsed = {
      given_name: 'Piotr',
      preferred_username: 'piotr.k',
    };
    keycloakInstanceMock.updateToken.mockResolvedValue(true);

    const result = await service.refreshToken(10);

    expect(result).toBe(true);
    expect(keycloakInstanceMock.updateToken).toHaveBeenCalledWith(10);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.username()).toBe('Piotr');
  });

  it('refreshToken should return false when keycloak is missing', async () => {
    const result = await service.refreshToken();

    expect(result).toBe(false);
    expect(keycloakInstanceMock.updateToken).not.toHaveBeenCalled();
  });

  it('refreshToken should reset auth state and stop interval on failure', async () => {
    keycloakInstanceMock.authenticated = true;
    keycloakInstanceMock.tokenParsed = {
      given_name: 'Jan',
    };

    await service.init();

    keycloakInstanceMock.updateToken.mockRejectedValue(new Error('refresh failed'));

    const result = await service.refreshToken();

    expect(result).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.username()).toBeNull();
    expect(clearIntervalSpy).toHaveBeenCalledWith(123);
  });

  it('getUsername should return undefined when username signal is null', () => {
    expect(service.getUsername()).toBeUndefined();
  });

  it('createKeycloak should use keycloakConfig values', () => {
    const realService = service as TestAuthService;
    const created = realService['createKeycloak']();

    expect(created).toBe(keycloakInstanceMock);
    expect(keycloakConfig.url).toBeTruthy();
    expect(keycloakConfig.realm).toBeTruthy();
    expect(keycloakConfig.clientId).toBeTruthy();
  });
});