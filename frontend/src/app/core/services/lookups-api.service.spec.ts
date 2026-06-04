import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LookupsApiService } from './lookups-api.service';
import { environment } from '../../../environments/environment';
import { LookupDto } from '../models/offers.models';

describe('LookupsApiService', () => {
  let service: LookupsApiService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/lookups`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(LookupsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getTechnologies should call GET /lookups/technologies', () => {
    const mockResponse: LookupDto[] = [
      { id: 'tech-1', name: 'Angular' },
      { id: 'tech-2', name: 'TypeScript' },
    ];

    service.getTechnologies().subscribe((result) => {
      expect(result).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${baseUrl}/technologies`);
    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);
  });

  it('getSpecializations should call GET /lookups/specializations', () => {
    const mockResponse: LookupDto[] = [
      { id: 'spec-1', name: 'Frontend' },
      { id: 'spec-2', name: 'Backend' },
    ];

    service.getSpecializations().subscribe((result) => {
      expect(result).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${baseUrl}/specializations`);
    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);
  });

  it('getWorkTypes should call GET /lookups/work-types', () => {
    const mockResponse: LookupDto[] = [
      { id: 'wt-1', name: 'Remote' },
      { id: 'wt-2', name: 'Hybrid' },
    ];

    service.getWorkTypes().subscribe((result) => {
      expect(result).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${baseUrl}/work-types`);
    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);
  });

  it('getExperienceLevels should call GET /lookups/experience-levels', () => {
    const mockResponse: LookupDto[] = [
      { id: 'exp-1', name: 'Junior' },
      { id: 'exp-2', name: 'Mid' },
    ];

    service.getExperienceLevels().subscribe((result) => {
      expect(result).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${baseUrl}/experience-levels`);
    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);
  });

  it('getSites should call GET /lookups/sites', () => {
    const mockResponse: LookupDto[] = [
      { id: 'site-1', name: 'Pracuj.pl' },
      { id: 'site-2', name: 'No Fluff Jobs' },
    ];

    service.getSites().subscribe((result) => {
      expect(result).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${baseUrl}/sites`);
    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);
  });

  it('getLocations should call GET /lookups/locations', () => {
    const mockResponse: LookupDto[] = [
      { id: 'loc-1', name: 'Warszawa' },
      { id: 'loc-2', name: 'Kraków' },
    ];

    service.getLocations().subscribe((result) => {
      expect(result).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${baseUrl}/locations`);
    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);
  });
});