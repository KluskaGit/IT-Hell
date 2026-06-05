import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NEVER, of, throwError } from 'rxjs';

import { ProfileComponent } from './profile.component';
import { AuthService } from '../auth/auth.service';
import { UserApiService } from '../../app/core/services/user-api.service';
import { CvApiService } from '../../app/core/services/cv-api.service';
import { LookupsApiService } from '../../app/core/services/lookups-api.service';

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;

    const authServiceMock = {
    getProfile: vi.fn(),
    isAuthenticated: vi.fn(),
    username: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    };

  const userApiMock = {
    getMe: vi.fn(),
    getMyProfile: vi.fn(),
    updateMyProfile: vi.fn(),
  };

  const cvApiMock = {
    uploadCv: vi.fn(),
  };

  // NEVER - forkJoin in FiltersFormComponent never completes, so filtersChange is not
  // emitted automatically during init. This keeps currentFilterValue null
  // until a test explicitly calls onFiltersChange().
  const lookupsApiMock = {
    getTechnologies:     vi.fn().mockReturnValue(NEVER),
    getSpecializations:  vi.fn().mockReturnValue(NEVER),
    getLocations:        vi.fn().mockReturnValue(NEVER),
    getSites:            vi.fn().mockReturnValue(NEVER),
    getExperienceLevels: vi.fn().mockReturnValue(NEVER),
    getWorkTypes:        vi.fn().mockReturnValue(NEVER),
  };

    beforeEach(async () => {
    authServiceMock.getProfile.mockReturnValue({
        email: 'test@example.com',
        firstName: 'Jan',
        lastName: 'Kowalski',
    });

    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.username.mockReturnValue('Jan');
    authServiceMock.login.mockResolvedValue(undefined);
    authServiceMock.logout.mockResolvedValue(undefined);

    userApiMock.getMe.mockResolvedValue({
        id_keycloak: 'kc-1',
        email: 'test@example.com',
        first_name: 'Jan',
        last_name: 'Kowalski',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    });

    userApiMock.getMyProfile.mockRejectedValue(
        new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        })
    );

    userApiMock.updateMyProfile.mockResolvedValue({
        id: 'profile-1',
        user_id: 'user-1',
        raw_cv: null,
        exp_level: { id: 'exp-1', name: 'Mid' },
        technologies: [
        { id: 'tech-1', name: 'Angular' },
        { id: 'tech-2', name: 'TypeScript' },
        ],
    });

    cvApiMock.uploadCv.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
        imports: [ProfileComponent],
        providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: UserApiService, useValue: userApiMock },
        { provide: CvApiService, useValue: cvApiMock },
        { provide: LookupsApiService, useValue: lookupsApiMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
        ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    });

  afterEach(() => {
    vi.clearAllMocks();
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

  it('should initialize profile data from token and backend', async () => {
    await initComponent();

    expect(authServiceMock.getProfile).toHaveBeenCalledTimes(1);
    expect(userApiMock.getMe).toHaveBeenCalledTimes(1);

    expect(component.email).toBe('test@example.com');
    expect(component.firstName).toBe('Jan');
    expect(component.lastName).toBe('Kowalski');
  });

  it('should create empty savedFilters when backend profile returns 404', async () => {
    await initComponent();

    expect(component.savedFilters).toEqual({
      selectedTechnologies: [],
      technologies: {},
      seniority: {},
    });

    expect(component.loadError).toBeNull();
  });

  it('should patch profile data returned from backend', async () => {
    userApiMock.getMyProfile.mockResolvedValue({
      id: 'profile-1',
      user_id: 'user-1',
      raw_cv: 'stored-cv',
      exp_level: { id: 'exp-2', name: 'Senior' },
      technologies: [{ id: 'tech-7', name: 'Docker' }],
    });

    await initComponent();

    expect(component.savedFilters).toEqual({
      selectedTechnologies: [{ id: 'tech-7', name: 'Docker' }],
      technologies: { 'tech-7': true },
      seniority: { 'exp-2': true },
    });

    expect(component.currentCvFile).toBe('Plik CV');
  });

  it('should update currentFilterValue on filters change', async () => {
    await initComponent();

    const value = {
      itArea: {},
      technologies: { 'tech-1': true },
      jobSites: {},
      workMode: {},
      seniority: { 'exp-1': true },
      salaryFromIndex: 0,
      salaryToIndex: 25,
      selectedLocations: [],
      selectedTechnologies: [{ id: 'tech-1', name: 'Angular' }],
      specializationIds: [],
      technologyIds: ['tech-1'],
      expLevelIds: ['exp-1'],
      workTypeIds: [],
      siteIds: [],
      locationIds: [],
      salaryFrom: 0,
      salaryTo: 50000,
    };

    component.onFiltersChange(value as any);

    expect((component as any).currentFilterValue).toEqual(value);
  });

  it('should show error when saving without currentFilterValue', async () => {
    await initComponent();

    await component.onSave();

    expect(component.saveError).toBe('Najpierw wybierz poziom doświadczenia i technologie.');
    expect(userApiMock.updateMyProfile).not.toHaveBeenCalled();
  });

  it('should show error when experience level is missing', async () => {
    await initComponent();

    component.onFiltersChange({
      itArea: {},
      technologies: { 'tech-1': true },
      jobSites: {},
      workMode: {},
      seniority: {},
      salaryFromIndex: 0,
      salaryToIndex: 25,
      selectedLocations: [],
      selectedTechnologies: [{ id: 'tech-1', name: 'Angular' }],
      specializationIds: [],
      technologyIds: ['tech-1'],
      expLevelIds: [],
      workTypeIds: [],
      siteIds: [],
      locationIds: [],
      salaryFrom: 0,
      salaryTo: 50000,
    } as any);

    await component.onSave();

    expect(component.saveError).toBe('Wybierz poziom doświadczenia.');
    expect(userApiMock.updateMyProfile).not.toHaveBeenCalled();
  });

  it('should call updateMyProfile and show success message on save', async () => {
    await initComponent();

    component.onFiltersChange({
      itArea: {},
      technologies: { 'tech-1': true, 'tech-2': true },
      jobSites: {},
      workMode: {},
      seniority: { 'exp-1': true },
      salaryFromIndex: 0,
      salaryToIndex: 25,
      selectedLocations: [],
      selectedTechnologies: [
        { id: 'tech-1', name: 'Angular' },
        { id: 'tech-2', name: 'TypeScript' },
      ],
      specializationIds: [],
      technologyIds: ['tech-1', 'tech-2'],
      expLevelIds: ['exp-1'],
      workTypeIds: [],
      siteIds: [],
      locationIds: [],
      salaryFrom: 0,
      salaryTo: 50000,
    } as any);

    await component.onSave();

    expect(userApiMock.updateMyProfile).toHaveBeenCalledTimes(1);
    expect(userApiMock.updateMyProfile).toHaveBeenCalledWith({
      exp_level_id: 'exp-1',
      technology_ids: ['tech-1', 'tech-2'],
    });

    expect(component.saveSuccess).toBe('Profil został zapisany.');
    expect(component.isSaving).toBe(false);
  });

  it('should show save error when updateMyProfile fails', async () => {
    userApiMock.updateMyProfile.mockRejectedValue(new Error('Save failed'));
    await initComponent();

    component.onFiltersChange({
      itArea: {},
      technologies: { 'tech-1': true },
      jobSites: {},
      workMode: {},
      seniority: { 'exp-1': true },
      salaryFromIndex: 0,
      salaryToIndex: 25,
      selectedLocations: [],
      selectedTechnologies: [{ id: 'tech-1', name: 'Angular' }],
      specializationIds: [],
      technologyIds: ['tech-1'],
      expLevelIds: ['exp-1'],
      workTypeIds: [],
      siteIds: [],
      locationIds: [],
      salaryFrom: 0,
      salaryTo: 50000,
    } as any);

    await component.onSave();

    expect(component.saveError).toBe('Nie udało się zapisać profilu.');
    expect(component.isSaving).toBe(false);
  });

  it('should clear CV state on removeCv', async () => {
    await initComponent();

    component.currentCvFile = 'cv.pdf';
    component.currentCvDate = '01.06.2026';
    component.scanComplete = true;

    component.removeCv();

    expect(component.currentCvFile).toBeNull();
    expect(component.currentCvDate).toBe('');
    expect(component.scanComplete).toBe(false);
  });

  it('should set dragging state on drag events', async () => {
    await initComponent();

    const dragEvent = {
      preventDefault: vi.fn(),
    } as unknown as DragEvent;

    component.onDragOver(dragEvent);
    expect(component.isDragging).toBe(true);

    component.onDragLeave(dragEvent);
    expect(component.isDragging).toBe(false);
  });

  it('should call handleFile on drop', async () => {
    await initComponent();

    const file = new File(['abc'], 'cv.pdf', { type: 'application/pdf' });
    const handleFileSpy = vi.spyOn(component as any, 'handleFile');

    const dropEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        files: [file],
      },
    } as unknown as DragEvent;

    component.onDrop(dropEvent);

    expect(handleFileSpy).toHaveBeenCalledWith(file);
    expect(component.isDragging).toBe(false);
  });
  it('should set loadError when backend loading fails with non-404 error', async () => {
  userApiMock.getMe.mockRejectedValue(new Error('backend failed'));

  await initComponent();

  expect(component.loadError).toBe('Nie udało się pobrać danych profilu z backendu.');
});

    it('should analyze CV successfully and patch technologies into filters form', async () => {
        await initComponent();
        vi.useFakeTimers();

        const filtersFormRefMock = {
            patchValue: vi.fn(),
        };

        component.filtersFormRef = filtersFormRefMock as any;

        component.onFiltersChange({
            itArea: {},
            technologies: {},
            jobSites: {},
            workMode: {},
            seniority: { 'exp-1': true },
            salaryFromIndex: 0,
            salaryToIndex: 25,
            selectedLocations: [],
            selectedTechnologies: [],
            specializationIds: [],
            technologyIds: [],
            expLevelIds: ['exp-1'],
            workTypeIds: [],
            siteIds: [],
            locationIds: [],
            salaryFrom: 0,
            salaryTo: 50000,
        } as any);

        cvApiMock.uploadCv.mockReturnValue(
            of([
            { id: 'tech-3', name: 'RxJS' },
            { id: 'tech-4', name: 'Docker' },
            ])
        );

        const file = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });

        (component as any).handleFile(file);

        expect(component.isScanning).toBe(true);
        expect(component.currentCvFile).toBe('cv.pdf');

        await vi.advanceTimersByTimeAsync(200);
        expect(component.scanProgress).toBe(35);

        await vi.advanceTimersByTimeAsync(150);

        expect(component.isScanning).toBe(false);
        expect(component.scanComplete).toBe(true);
        expect(filtersFormRefMock.patchValue).toHaveBeenCalledWith(
            expect.objectContaining({
            selectedTechnologies: [
                { id: 'tech-3', name: 'RxJS' },
                { id: 'tech-4', name: 'Docker' },
            ],
            technologies: {
                'tech-3': true,
                'tech-4': true,
            },
            })
        );
        expect(component.currentCvDate).not.toBe('');

        component.ngOnDestroy();
        vi.useRealTimers();
    });

    it('should show saveError when CV analysis fails', async () => {
        await initComponent();
        vi.useFakeTimers();

        cvApiMock.uploadCv.mockReturnValue(
            throwError(() => new Error('scan failed'))
        );

        const file = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });

        (component as any).handleFile(file);

        expect(component.isScanning).toBe(true);

        await vi.advanceTimersByTimeAsync(150);

        expect(component.isScanning).toBe(false);
        expect(component.scanComplete).toBe(false);
        expect(component.saveError).toBe('Nie udało się przeanalizować CV.');

        component.ngOnDestroy();
        vi.useRealTimers();
    });

    it('should clear saveSuccess after 3 seconds', async () => {
        await initComponent();
        vi.useFakeTimers();

        component.onFiltersChange({
            itArea: {},
            technologies: { 'tech-1': true },
            jobSites: {},
            workMode: {},
            seniority: { 'exp-1': true },
            salaryFromIndex: 0,
            salaryToIndex: 25,
            selectedLocations: [],
            selectedTechnologies: [{ id: 'tech-1', name: 'Angular' }],
            specializationIds: [],
            technologyIds: ['tech-1'],
            expLevelIds: ['exp-1'],
            workTypeIds: [],
            siteIds: [],
            locationIds: [],
            salaryFrom: 0,
            salaryTo: 50000,
        } as any);

        const savePromise = component.onSave();

        await Promise.resolve();
        await savePromise;

        expect(component.saveSuccess).toBe('Profil został zapisany.');

        await vi.advanceTimersByTimeAsync(3000);

        expect(component.saveSuccess).toBeNull();

        component.ngOnDestroy();
        vi.useRealTimers();
    });
});