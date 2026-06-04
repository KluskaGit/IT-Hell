import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, ParamMap, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { OffersComponent } from './offers.component';
import { AuthService } from '../auth/auth.service';
import { UserApiService } from '../../app/core/services/user-api.service';
import { JobOffersApiService, MappedOffer } from '../../app/core/services/job-offers-api.service';
import { FILTERS_STORAGE_KEY, FiltersValue } from '../../app/shared/filters-form/filters-form.types';

describe('OffersComponent', () => {
  let fixture: ComponentFixture<OffersComponent>;
  let component: OffersComponent;
  let router: Router;
  let queryParamMap$: BehaviorSubject<ParamMap>;
  let routerEvents$: Subject<unknown>;

  const authServiceMock = {
    isAuthenticated: vi.fn(),
    username: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  };

  const userApiMock = {
    getMyProfile: vi.fn(),
  };

  const jobOffersApiMock = {
    getOffers: vi.fn(),
    mapToOffer: vi.fn(),
  };

  const emptyFilters: FiltersValue = {
    itArea: {},
    technologies: {},
    jobSites: {},
    workMode: {},
    seniority: {},
    salaryFromIndex: 0,
    salaryToIndex: 25,
    selectedLocations: [],
    selectedTechnologies: [],
    specializationIds: [],
    technologyIds: [],
    expLevelIds: [],
    workTypeIds: [],
    siteIds: [],
    locationIds: [],
    salaryFrom: 0,
    salaryTo: 50000,
  };

  const mappedOfferA: MappedOffer = {
    id: 'offer-a',
    title: 'Angular Developer',
    company: 'Acme',
    location: 'Warszawa',
    workMode: 'Remote',
    workTypeId: 'wt-1',
    salaryMin: 10000,
    salaryMax: 15000,
    technologies: ['tech-1', 'tech-2'],
    technologyNames: ['Angular', 'TypeScript'],
    roles: ['role-1'],
    seniority: 'Mid',
    source: 'site-1',
    postedLabel: '',
    description: '',
    url: 'https://example.com/a',
    publicationDate: '2026-06-01T10:00:00Z',
    expirationDate: '2026-06-10T10:00:00Z',
  };

  const mappedOfferB: MappedOffer = {
    id: 'offer-b',
    title: 'Backend Developer',
    company: 'Beta',
    location: 'Kraków',
    workMode: 'Hybrid',
    workTypeId: 'wt-2',
    salaryMin: 0,
    salaryMax: 0,
    technologies: ['tech-3'],
    technologyNames: ['Python'],
    roles: ['role-2'],
    seniority: 'Senior',
    source: 'site-2',
    postedLabel: '',
    description: '',
    url: undefined,
    publicationDate: null,
    expirationDate: null,
  };

  beforeEach(async () => {
    routerEvents$ = new Subject();
    queryParamMap$ = new BehaviorSubject(convertToParamMap({}));

    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.username.mockReturnValue('Jan');
    authServiceMock.login.mockResolvedValue(undefined);
    authServiceMock.logout.mockResolvedValue(undefined);

    userApiMock.getMyProfile.mockResolvedValue({
      id: 'profile-1',
      user_id: 'user-1',
      raw_cv: null,
      exp_level: { id: 'exp-1', name: 'Mid' },
      technologies: [
        { id: 'tech-1', name: 'Angular' },
        { id: 'tech-2', name: 'TypeScript' },
      ],
    });

    jobOffersApiMock.getOffers.mockReturnValue(of([]));
    jobOffersApiMock.mapToOffer.mockImplementation((value: any) => value as MappedOffer);

    class IntersectionObserverMock {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      constructor(_cb?: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
    }

    (globalThis as any).IntersectionObserver = IntersectionObserverMock;

    await TestBed.configureTestingModule({
      imports: [OffersComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap$.asObservable(),
          },
        },
        { provide: AuthService, useValue: authServiceMock },
        { provide: UserApiService, useValue: userApiMock },
        { provide: JobOffersApiService, useValue: jobOffersApiMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OffersComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    Object.defineProperty(router, 'events', {
      value: routerEvents$.asObservable(),
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  async function initComponent() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('should create', async () => {
    await initComponent();
    expect(component).toBeTruthy();
  });

  it('should expose authentication state from AuthService', async () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    await initComponent();

    expect(component.isAuthenticated()).toBe(true);
  });

  it('should restore initialFilters from URL params on init', async () => {
    queryParamMap$.next(
      convertToParamMap({
        roles: ['role-1'],
        seniority: ['exp-1'],
        wm: ['wt-1'],
        sites: ['site-1'],
        loc: ['loc-1'],
        tech: ['tech-1'],
        salFrom: '2',
        salTo: '8',
      })
    );

    await initComponent();

    expect(component.initialFilters).toEqual({
      itArea: { 'role-1': true },
      seniority: { 'exp-1': true },
      workModeIds: ['wt-1'],
      jobSiteKeys: ['site-1'],
      locationIds: ['loc-1'],
      technologies: { 'tech-1': true },
      salaryFromIndex: 2,
      salaryToIndex: 8,
    });
  });

  it('should restore initialFilters from localStorage when URL is empty', async () => {
    localStorage.setItem(
      FILTERS_STORAGE_KEY,
      JSON.stringify({
        selectedTechnologies: [{ id: 'tech-9', name: 'Docker' }],
        seniority: { 'exp-2': true },
      })
    );

    await initComponent();

    expect(component.initialFilters).toEqual({
      selectedTechnologies: [{ id: 'tech-9', name: 'Docker' }],
      seniority: { 'exp-2': true },
    });
  });

  it('should call updateUrl and load offers on onFiltersReady', async () => {
    await initComponent();

    component.onFiltersReady(emptyFilters);

    expect(component.currentFilters).toEqual(emptyFilters);
    expect(router.navigate).toHaveBeenCalled();
    expect(jobOffersApiMock.getOffers).toHaveBeenCalledTimes(1);
  });

  it('should compute matched offers immediately on onFiltersChange', async () => {
    await initComponent();

    component.allOffers = [mappedOfferA, mappedOfferB];
    component.currentFilters = {
      ...emptyFilters,
      itArea: { 'role-1': true },
      technologies: { 'tech-1': true },
      salaryFrom: 9000,
      salaryTo: 20000,
    };

    component.onFiltersChange(component.currentFilters);

    expect(component.matchedOffers).toHaveLength(2);
    expect(component.matchedOffers[0].matchedRoles).toEqual(['role-1']);
    expect(component.matchedOffers[0].matchedTech).toEqual(['tech-1']);
    expect(component.matchedOffers[1].matchedRoles).toEqual([]);
    expect(component.matchedOffers[1].matchedTech).toEqual([]);
  });

  it('should debounce search changes and reload offers', async () => {
    await initComponent();
    vi.useFakeTimers();

    component.currentFilters = { ...emptyFilters };
    const getOffersSpy = jobOffersApiMock.getOffers;

    component.onSearchChange('Angular');

    expect(component.searchQuery).toBe('Angular');
    expect(getOffersSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);

    expect(getOffersSpy).toHaveBeenCalledTimes(1);

    component.ngOnDestroy();
    vi.useRealTimers();
  });

  it('should clear search and trigger reload after debounce', async () => {
    await initComponent();
    vi.useFakeTimers();

    component.currentFilters = { ...emptyFilters };
    component.searchQuery = 'Angular';

    component.onSearchClear();

    expect(component.searchQuery).toBe('');

    await vi.advanceTimersByTimeAsync(500);

    expect(jobOffersApiMock.getOffers).toHaveBeenCalledTimes(1);

    component.ngOnDestroy();
    vi.useRealTimers();
  });

  it('should load and sort first page of offers', async () => {
    await initComponent();

    jobOffersApiMock.getOffers.mockReturnValue(
      of([mappedOfferB, mappedOfferA] as any[])
    );
    jobOffersApiMock.mapToOffer.mockImplementation((value: any) => value as MappedOffer);

    component.onFiltersReady({
      ...emptyFilters,
      technologies: { 'tech-1': true },
    });

    expect(component.allOffers).toHaveLength(2);
    expect(component.allOffers[0].id).toBe('offer-a');
    expect(component.allOffers[1].id).toBe('offer-b');
    expect(component.currentPage).toBe(0);
    expect(component.hasMore).toBe(false);
    expect(component.isLoading).toBe(false);
  });

  it('should append next page on loadMore', async () => {
    await initComponent();

    component.currentFilters = { ...emptyFilters };
    component.currentPage = 0;
    component.hasMore = true;
    component.isLoading = false;
    component.isLoadingMore = false;
    component.allOffers = [mappedOfferA];

    jobOffersApiMock.getOffers.mockReturnValue(of([mappedOfferB] as any[]));
    jobOffersApiMock.mapToOffer.mockImplementation((value: any) => value as MappedOffer);

    component.loadMore();

    expect(jobOffersApiMock.getOffers).toHaveBeenCalledTimes(1);
    expect(component.allOffers).toHaveLength(2);
    expect(component.currentPage).toBe(1);
  });

  it('should not load more when currentFilters are missing', async () => {
    await initComponent();

    component.currentFilters = null;
    component.loadMore();

    expect(jobOffersApiMock.getOffers).not.toHaveBeenCalled();
  });

  it('should set human-readable loadError for backend connection error', async () => {
    await initComponent();

    jobOffersApiMock.getOffers.mockReturnValue(
      new Subject<any>().asObservable()
    );

    const errorObservable = {
      pipe: () => ({
        subscribe: ({ error }: any) => error({ status: 0 }),
      }),
    };

    jobOffersApiMock.getOffers.mockReturnValue(errorObservable as any);

    component.onFiltersReady(emptyFilters);

    expect(component.loadError).toBe('Brak połączenia z serwerem. Sprawdź czy backend jest uruchomiony.');
    expect(component.isLoading).toBe(false);
  });

  it('should set formatted loadError for http error with status code', async () => {
    await initComponent();

    const errorObservable = {
      pipe: () => ({
        subscribe: ({ error }: any) => error({ status: 500 }),
      }),
    };

    jobOffersApiMock.getOffers.mockReturnValue(errorObservable as any);

    component.onFiltersReady(emptyFilters);

    expect(component.loadError).toBe('Nie udało się załadować ofert (błąd 500).');
    expect(component.isLoading).toBe(false);
  });

  it('should return displayedOffers from matchedOffers', async () => {
    await initComponent();

    component.matchedOffers = [
      { ...mappedOfferA, matchedTech: ['tech-1'], matchedRoles: ['role-1'] },
    ] as any;

    expect(component.displayedOffers).toEqual(component.matchedOffers);
  });

  it('should detect salary presence correctly', async () => {
    await initComponent();

    expect(component.hasSalary({ ...mappedOfferA, matchedTech: [], matchedRoles: [] } as any)).toBe(true);
    expect(component.hasSalary({ ...mappedOfferB, matchedTech: [], matchedRoles: [] } as any)).toBe(false);
  });

  it('should format role, technology, source and work mode using filtersFormRef', async () => {
    await initComponent();

    component.filtersFormRef = {
      formatRole: vi.fn().mockReturnValue('Frontend'),
      formatTech: vi.fn().mockReturnValue('Angular'),
      availableSites: [{ key: 'site-1', label: 'Pracuj.pl' }],
      availableWorkTypes: [{ id: 'wt-1', label: 'Remote' }],
    } as any;

    expect(component.formatRole('role-1')).toBe('Frontend');
    expect(component.formatTech('tech-1')).toBe('Angular');
    expect(component.formatSource('site-1')).toBe('Pracuj.pl');
    expect(component.getWorkModeLabel('wt-1')).toBe('Remote');
  });

  it('should fall back to raw values when filtersFormRef is missing', async () => {
    await initComponent();

    component.filtersFormRef = undefined;

    expect(component.formatRole('role-1')).toBe('role-1');
    expect(component.formatTech('tech-1')).toBe('tech-1');
    expect(component.formatSource('site-1')).toBe('site-1');
    expect(component.getWorkModeLabel('wt-1')).toBe('wt-1');
  });

  it('should open external offer in new tab when url exists', async () => {
    await initComponent();

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    component.openOffer({ ...mappedOfferA, matchedTech: [], matchedRoles: [] } as any);

    expect(openSpy).toHaveBeenCalledWith(
      'https://example.com/a',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('should not open offer when url is missing', async () => {
    await initComponent();

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    component.openOffer({ ...mappedOfferB, matchedTech: [], matchedRoles: [] } as any);

    expect(openSpy).not.toHaveBeenCalled();
  });

  it('should fill filters from profile for authenticated user', async () => {
    await initComponent();

    const filtersFormRefMock = {
      patchValue: vi.fn(),
      computeValue: vi.fn().mockReturnValue({
        ...emptyFilters,
        selectedTechnologies: [],
      }),
    };

    component.filtersFormRef = filtersFormRefMock as any;
    component.currentFilters = { ...emptyFilters };

    await component.fillFromProfile();

    expect(userApiMock.getMyProfile).toHaveBeenCalledTimes(1);
    expect(component.initialFilters).toEqual(
      expect.objectContaining({
        selectedTechnologies: [
          { id: 'tech-1', name: 'Angular' },
          { id: 'tech-2', name: 'TypeScript' },
        ],
        technologies: {
          'tech-1': true,
          'tech-2': true,
        },
        seniority: {
          'exp-1': true,
        },
      })
    );
    expect(filtersFormRefMock.patchValue).toHaveBeenCalled();
  });

  it('should not fill filters from profile when user is not authenticated', async () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    await initComponent();

    await component.fillFromProfile();

    expect(userApiMock.getMyProfile).not.toHaveBeenCalled();
  });

  it('should update sidebar width while dragging and persist it on drag end', async () => {
    await initComponent();

    component.sidebarWidth = 340;

    component.onDragStart({
      preventDefault: vi.fn(),
      clientX: 300,
    } as unknown as MouseEvent);

    expect(component.isSidebarDragging).toBe(true);

    (component as any).onDragMove({ clientX: 360 } as MouseEvent);
    expect(component.sidebarWidth).toBe(400);

    (component as any).onDragEnd();

    expect(component.isSidebarDragging).toBe(false);
    expect(localStorage.getItem('cv_offers_sidebar_width')).toBe('400');
  });

  it('should clamp sidebar width to min and max while dragging', async () => {
    await initComponent();

    component.sidebarWidth = 340;

    component.onDragStart({
      preventDefault: vi.fn(),
      clientX: 300,
    } as unknown as MouseEvent);

    (component as any).onDragMove({ clientX: -1000 } as MouseEvent);
    expect(component.sidebarWidth).toBe(240);

    (component as any).onDragMove({ clientX: 5000 } as MouseEvent);
    expect(component.sidebarWidth).toBe(480);

    (component as any).onDragEnd();
  });

  it('should return ids in trackBy helpers', async () => {
    await initComponent();

    expect(component.trackOffer(0, { ...mappedOfferA, matchedTech: [], matchedRoles: [] } as any)).toBe('offer-a');
    expect(component.trackByString(0, 'tech-1')).toBe('tech-1');
  });
});