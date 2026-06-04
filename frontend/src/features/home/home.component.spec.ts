import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { of, throwError  } from 'rxjs';

import { HomeComponent } from './home.component';
import { AuthService } from '../auth/auth.service';
import { CvApiService } from '../../app/core/services/cv-api.service';
import { UserApiService } from '../../app/core/services/user-api.service';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let router: Router;

  const authServiceMock = {
    isAuthenticated: vi.fn(),
    username: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  };

  const cvApiMock = {
    uploadCv: vi.fn(),
  };

  const userApiMock = {
    getMyProfile: vi.fn(),
  };

  beforeEach(async () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    authServiceMock.username.mockReturnValue('Jan');
    authServiceMock.login.mockResolvedValue(undefined);
    authServiceMock.logout.mockResolvedValue(undefined);

    cvApiMock.uploadCv.mockReturnValue(
      of([
        { id: 'tech-1', name: 'Angular' },
        { id: 'tech-2', name: 'TypeScript' },
      ])
    );

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

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: CvApiService, useValue: cvApiMock },
        { provide: UserApiService, useValue: userApiMock },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
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

  it('should expose authentication state getter from AuthService', async () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    await initComponent();

    expect(component.isAuthenticated()).toBe(true);
  });

  it('should navigate to /offers with filters and cv file name on submit', async () => {
    await initComponent();

    const filtersValue = {
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

    component.selectedFile = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });

    component.onSubmit(filtersValue as any);

    expect(router.navigate).toHaveBeenCalledWith(['/offers'], {
      state: {
        filters: filtersValue,
        cvFileName: 'cv.pdf',
      },
    });

    expect(localStorage.getItem('cv_analizer_candidate_filters')).toBeTruthy();
  });

  it('should reject unsupported file extension', async () => {
    await initComponent();

    const invalidFile = new File(['abc'], 'cv.txt', { type: 'text/plain' });
    (component as any).handleFile(invalidFile);

    expect(component.uploadError).toBe('Dozwolone są tylko pliki PDF, DOC, DOCX!');
    expect(cvApiMock.uploadCv).not.toHaveBeenCalled();
  });

  it('should reject file larger than 10 MB', async () => {
    await initComponent();

    const bigFile = new File([new Uint8Array(11 * 1024 * 1024)], 'cv.pdf', {
      type: 'application/pdf',
    });

    (component as any).handleFile(bigFile);

    expect(component.uploadError).toBe('Plik jest za duży. Maksymalny rozmiar to 10 MB.');
    expect(cvApiMock.uploadCv).not.toHaveBeenCalled();
  });

  it('should accept valid file and start CV analysis', async () => {
    await initComponent();

    const analyzeSpy = vi.spyOn(component as any, 'analyzeCV');
    const validFile = new File(['abc'], 'cv.pdf', { type: 'application/pdf' });

    (component as any).handleFile(validFile);

    expect(component.uploadError).toBeNull();
    expect(component.selectedFile).toBe(validFile);
    expect(analyzeSpy).toHaveBeenCalledWith(validFile);
  });

  it('should reset CV state on removeFile', async () => {
    await initComponent();

    const stopPropagation = vi.fn();
    const filtersFormRefMock = {
      patchValue: vi.fn(),
    };

    component.selectedFile = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });
    component.scanComplete = true;
    component.filtersFormRef = filtersFormRefMock as any;

    component.removeFile({ stopPropagation } as unknown as Event);

    expect(stopPropagation).toHaveBeenCalled();
    expect(component.selectedFile).toBeNull();
    expect(component.scanComplete).toBe(false);
    expect(filtersFormRefMock.patchValue).toHaveBeenCalledWith({
      selectedTechnologies: [],
    });
  });

  it('should set dragging state on drag events', async () => {
    await initComponent();

    const event = { preventDefault: vi.fn() } as unknown as DragEvent;

    component.onDragOver(event);
    expect(component.isDragging).toBe(true);

    component.onDragLeave(event);
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

  it('should call handleFile on file input selection', async () => {
    await initComponent();

    const file = new File(['abc'], 'cv.pdf', { type: 'application/pdf' });
    const handleFileSpy = vi.spyOn(component as any, 'handleFile');

    const inputEvent = {
      target: {
        files: [file],
      },
    } as unknown as Event;

    component.onFileSelected(inputEvent);

    expect(handleFileSpy).toHaveBeenCalledWith(file);
  });

    it('should fill filters from profile', async () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    await initComponent();

    const filtersFormRefMock = {
        patchValue: vi.fn(),
        computeValue: vi.fn().mockReturnValue({
        itArea: {},
        jobSites: {},
        workMode: {},
        seniority: {},
        salaryFromIndex: 0,
        salaryToIndex: 25,
        selectedLocations: [],
        selectedTechnologies: [],
        }),
    };

    component.filtersFormRef = filtersFormRefMock as any;

    await component.fillFromProfile();

    expect(userApiMock.getMyProfile).toHaveBeenCalledTimes(1);
    expect(filtersFormRefMock.patchValue).toHaveBeenCalledWith(
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

    expect(component.fillProfileError).toBeNull();
    });

    it('should set fillProfileError when fillFromProfile fails', async () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    userApiMock.getMyProfile.mockRejectedValue(new Error('profile failed'));
    await initComponent();

    const filtersFormRefMock = {
        patchValue: vi.fn(),
        computeValue: vi.fn(),
    };

    component.filtersFormRef = filtersFormRefMock as any;

    await component.fillFromProfile();

    expect(component.fillProfileError).toBe('Nie udało się pobrać danych z profilu.');
    });
    it('should analyze CV successfully and patch detected technologies to filters form', async () => {
        await initComponent();
        vi.useFakeTimers();

        const filtersFormRefMock = {
            patchValue: vi.fn(),
            computeValue: vi.fn().mockReturnValue({
            itArea: {},
            jobSites: {},
            workMode: {},
            seniority: {},
            salaryFromIndex: 0,
            salaryToIndex: 25,
            selectedLocations: [],
            selectedTechnologies: [],
            }),
        };

        component.filtersFormRef = filtersFormRefMock as any;

        cvApiMock.uploadCv.mockReturnValue(
            of([
            { id: 'tech-3', name: 'RxJS' },
            { id: 'tech-4', name: 'Docker' },
            ])
        );

        const file = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });

        (component as any).handleFile(file);

        expect(component.isScanning).toBe(true);
        expect(component.selectedFile).toBe(file);

        await vi.advanceTimersByTimeAsync(200);
        expect(component.scanProgress).toBe(35);

        await vi.advanceTimersByTimeAsync(150);

        expect(component.isScanning).toBe(false);
        expect(component.scanComplete).toBe(true);
        expect(filtersFormRefMock.patchValue).toHaveBeenCalledWith({
            selectedTechnologies: [
            { id: 'tech-3', name: 'RxJS' },
            { id: 'tech-4', name: 'Docker' },
            ],
        });

        component.ngOnDestroy();
        vi.useRealTimers();
    });

    it('should reset state when CV analysis fails', async () => {
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
        expect(component.selectedFile).toBeNull();
        expect(component.scanStatus).toBe('Nie udało się przeanalizować CV');

        component.ngOnDestroy();
        vi.useRealTimers();
    });

        it('should not fill filters from profile when user is not authenticated', async () => {
        authServiceMock.isAuthenticated.mockReturnValue(false);
        await initComponent();

        const filtersFormRefMock = {
            patchValue: vi.fn(),
            computeValue: vi.fn(),
        };

        component.filtersFormRef = filtersFormRefMock as any;

        await component.fillFromProfile();

        expect(userApiMock.getMyProfile).not.toHaveBeenCalled();
        expect(filtersFormRefMock.patchValue).not.toHaveBeenCalled();
        expect(component.fillProfileError).toBeNull();
    });
});