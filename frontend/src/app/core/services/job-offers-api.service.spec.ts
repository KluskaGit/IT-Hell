import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { JobOffersApiService } from './job-offers-api.service';
import { environment } from '../../../environments/environment';
import { JobOfferApiResponse } from '../models/offers.models';

describe('JobOffersApiService', () => {
  let service: JobOffersApiService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/job-offers`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(JobOffersApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getOffers should call GET /job-offers/get_offer_filter without params when none provided', () => {
    service.getOffers().subscribe((result) => {
      expect(result).toEqual([]);
    });

    const req = httpMock.expectOne(`${baseUrl}/get_offer_filter`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);

    req.flush([]);
  });

  it('getOffers should send scalar params and repeated array params', () => {
    service.getOffers({
      salary_from_min: 10000,
      salary_to_max: 25000,
      skip: 20,
      limit: 10,
      title: 'Angular Developer',
      technology_ids: ['tech-1', 'tech-2'],
      specialization_ids: ['spec-1'],
      work_type_ids: ['work-1', 'work-2'],
      exp_level_ids: ['exp-1'],
      site_ids: ['site-1'],
      location_ids: ['loc-1', 'loc-2'],
    }).subscribe();

    const req = httpMock.expectOne((request) => {
      return request.url === `${baseUrl}/get_offer_filter`;
    });

    expect(req.request.method).toBe('GET');

    const params = req.request.params;
    expect(params.get('salary_from_min')).toBe('10000');
    expect(params.get('salary_to_max')).toBe('25000');
    expect(params.get('skip')).toBe('20');
    expect(params.get('limit')).toBe('10');
    expect(params.get('title')).toBe('Angular Developer');

    expect(params.getAll('technology_ids')).toEqual(['tech-1', 'tech-2']);
    expect(params.getAll('specialization_ids')).toEqual(['spec-1']);
    expect(params.getAll('work_type_ids')).toEqual(['work-1', 'work-2']);
    expect(params.getAll('exp_level_ids')).toEqual(['exp-1']);
    expect(params.getAll('site_ids')).toEqual(['site-1']);
    expect(params.getAll('location_ids')).toEqual(['loc-1', 'loc-2']);

    req.flush([]);
  });

  it('mapToOffer should map complete API response correctly', () => {
    const apiOffer = {
      id: 'offer-1',
      title: 'Senior Angular Developer',
      company: { id: 'company-1', name: 'Acme' },
      locations: [
        { id: 'loc-1', name: 'Warszawa' },
        { id: 'loc-2', name: 'Kraków' },
      ],
      work_type: { id: 'work-1', name: 'Remote' },
      salary_from: 18000,
      salary_to: 26000,
      technologies: [
        { id: 'tech-1', name: 'Angular' },
        { id: 'tech-2', name: 'TypeScript' },
      ],
      specialization: { id: 'spec-1', name: 'Frontend' },
      exp_level: { id: 'exp-1', name: 'Senior' },
      site: { id: 'site-1', name: 'No Fluff Jobs' },
      description: 'Real description',
      url: 'https://example.com/offer/1',
      publication_date: '2026-06-01T10:00:00Z',
      expiration_date: '2026-06-15T10:00:00Z',
    } as JobOfferApiResponse;

    const result = service.mapToOffer(apiOffer);

    expect(result).toEqual({
      id: 'offer-1',
      title: 'Senior Angular Developer',
      company: 'Acme',
      location: 'Warszawa, Kraków',
      workMode: 'Remote',
      workTypeId: 'work-1',
      salaryMin: 18000,
      salaryMax: 26000,
      technologies: ['tech-1', 'tech-2'],
      technologyNames: ['Angular', 'TypeScript'],
      roles: ['spec-1'],
      seniority: 'Senior',
      source: 'site-1',
      postedLabel: '',
      description: 'Real description',
      url: 'https://example.com/offer/1',
      publicationDate: '2026-06-01T10:00:00Z',
      expirationDate: '2026-06-15T10:00:00Z',
    });
  });

  it('mapToOffer should use fallbacks for missing optional fields', () => {
    const apiOffer = {
      id: 'offer-2',
      title: null,
      company: null,
      locations: [],
      work_type: null,
      salary_from: null,
      salary_to: null,
      technologies: [],
      specialization: null,
      exp_level: null,
      site: null,
      description: 'None',
      url: undefined,
      publication_date: null,
      expiration_date: null,
    } as unknown as JobOfferApiResponse;

    const result = service.mapToOffer(apiOffer);

    expect(result).toEqual({
      id: 'offer-2',
      title: '',
      company: 'Nieznana firma',
      location: 'Zdalnie',
      workMode: 'Nie podano',
      workTypeId: '',
      salaryMin: 0,
      salaryMax: 0,
      technologies: [],
      technologyNames: [],
      roles: [],
      seniority: 'Nie podano',
      source: '',
      postedLabel: '',
      description: '',
      url: undefined,
      publicationDate: null,
      expirationDate: null,
    });
  });

  it('mapToOffer should return empty description when backend returns string "None"', () => {
    const apiOffer = {
      id: 'offer-3',
      title: 'Test',
      company: null,
      locations: [],
      work_type: null,
      salary_from: null,
      salary_to: null,
      technologies: [],
      specialization: null,
      exp_level: null,
      site: null,
      description: 'None',
      publication_date: null,
      expiration_date: null,
    } as unknown as JobOfferApiResponse;

    const result = service.mapToOffer(apiOffer);

    expect(result.description).toBe('');
  });
});