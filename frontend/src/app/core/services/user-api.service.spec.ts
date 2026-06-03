import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  UserApiService,
  UserMeDto,
  UserProfileDto,
  UserProfileUpdateDto,
} from './user-api.service';
import { environment } from '../../../environments/environment';

describe('UserApiService', () => {
  let service: UserApiService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/users`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(UserApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getMe should call GET /users/me', async () => {
    const mockResponse: UserMeDto = {
      id_keycloak: 'kc-123',
      email: 'test@example.com',
      first_name: 'Jan',
      last_name: 'Kowalski',
      is_active: true,
      created_at: '2026-01-01T10:00:00Z',
      updated_at: '2026-01-02T10:00:00Z',
    };

    const promise = service.getMe();

    const req = httpMock.expectOne(`${baseUrl}/me`);
    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);

    const result = await promise;
    expect(result).toEqual(mockResponse);
  });

  it('getMyProfile should call GET /users/me/profile', async () => {
    const mockResponse: UserProfileDto = {
      id: 'profile-1',
      user_id: 'user-1',
      raw_cv: null,
      exp_level: {
        id: 'exp-1',
        name: 'Mid',
      },
      technologies: [
        { id: 'tech-1', name: 'Angular' },
        { id: 'tech-2', name: 'TypeScript' },
      ],
    };

    const promise = service.getMyProfile();

    const req = httpMock.expectOne(`${baseUrl}/me/profile`);
    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);

    const result = await promise;
    expect(result).toEqual(mockResponse);
  });

  it('updateMyProfile should call PUT /users/me/profile with payload', async () => {
    const payload: UserProfileUpdateDto = {
      exp_level_id: 'exp-2',
      technology_ids: ['tech-1', 'tech-3'],
    };

    const mockResponse: UserProfileDto = {
      id: 'profile-1',
      user_id: 'user-1',
      raw_cv: null,
      exp_level: {
        id: 'exp-2',
        name: 'Senior',
      },
      technologies: [
        { id: 'tech-1', name: 'Angular' },
        { id: 'tech-3', name: 'RxJS' },
      ],
    };

    const promise = service.updateMyProfile(payload);

    const req = httpMock.expectOne(`${baseUrl}/me/profile`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);

    req.flush(mockResponse);

    const result = await promise;
    expect(result).toEqual(mockResponse);
  });
});