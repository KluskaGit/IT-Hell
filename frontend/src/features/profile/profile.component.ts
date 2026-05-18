import { ChangeDetectorRef, Component, Inject, OnInit, OnDestroy, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { NavbarComponent } from '../../app/shared/navbar/navbar.component';
import { FooterComponent } from '../../app/shared/footer/footer.component';
import { FiltersFormComponent } from '../../app/shared/filters-form/filters-form.component';
import { FiltersInitialState, FiltersValue } from '../../app/shared/filters-form/filters-form.types';
import { AuthService } from '../auth/auth.service';
import { CvApiService } from '../../app/core/services/cv-api.service';
import {
  UserApiService,
  UserMeDto,
  UserProfileDto,
  UserProfileCreateDto,
  UserProfileUpdateDto,
} from '../../app/core/services/user-api.service';

const STORAGE_KEY = 'cv_analizer_candidate_filters';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent, FiltersFormComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  @ViewChild(FiltersFormComponent) filtersFormRef?: FiltersFormComponent;

  email = '';
  firstName = '';
  lastName = '';
  currentCvFile: string | null = null;
  currentCvDate = '';
  isDragging = false;

  isScanning = false;
  scanProgress = 0;
  scanStatus = '';
  scanComplete = false;

  savedFilters: FiltersInitialState | null = null;
  private currentFilterValue: FiltersValue | null = null;

  isProfileLoading = true;
  isSaving = false;
  loadError: string | null = null;
  saveError: string | null = null;
  saveSuccess: string | null = null;

  private profileExists = false;
  private saveSuccessTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly userApi: UserApiService,
    private readonly cvApi: CvApiService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.initFromToken();
    await this.loadUserDataFromBackend();
  }

  ngOnDestroy(): void {
    if (this.saveSuccessTimer) clearTimeout(this.saveSuccessTimer);
  }

  private initFromToken(): void {
    const profile = this.authService.getProfile();
    this.email = profile.email;
    this.firstName = profile.firstName ?? '';
    this.lastName = profile.lastName ?? '';
  }

  private async loadUserDataFromBackend(): Promise<void> {
    this.loadError = null;
    try {
      const me = await this.userApi.getMe();
      this.patchUserData(me);
      try {
        const profile = await this.userApi.getMyProfile();
        this.profileExists = true;
        this.patchProfileData(profile);
      } catch (error) {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.profileExists = false;
          this.savedFilters = { selectedTechnologies: [], technologies: {}, seniority: {} };
          return;
        }
        throw error;
      }
    } catch (error) {
      this.loadError = 'Nie udało się pobrać danych profilu z backendu.';
      this.savedFilters = { selectedTechnologies: [], technologies: {}, seniority: {} };
    } finally {
      this.isProfileLoading = false;
      this.cdr.markForCheck();
    }
  }

  private patchUserData(me: UserMeDto): void {
    this.email = me.email ?? this.email;
    this.firstName = me.first_name ?? this.firstName;
    this.lastName = me.last_name ?? this.lastName;
  }

  private loadStoredFilters(): FiltersInitialState | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private saveFilters(value: FiltersValue): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        itArea: value.itArea,
        jobSites: value.jobSites,
        workMode: value.workMode,
        seniority: value.seniority,
        salaryFromIndex: value.salaryFromIndex,
        salaryToIndex: value.salaryToIndex,
        selectedLocations: value.selectedLocations,
        selectedTechnologies: value.selectedTechnologies,
      }));
    } catch { /* ignore */ }
  }

  private patchProfileData(profile: UserProfileDto): void {
    const selectedTechnologies = profile.technologies.map(t => ({ id: t.id, name: t.name }));
    const expLevelId = profile.exp_level?.id ?? '';

    const stored = this.loadStoredFilters();
    this.savedFilters = {
      ...(stored ?? {}),
      selectedTechnologies,
      technologies: Object.fromEntries(selectedTechnologies.map(t => [t.id, true])),
      seniority: expLevelId ? { [expLevelId]: true } : {},
    };
    this.currentFilterValue = {
      itArea: {},
      technologies: Object.fromEntries(selectedTechnologies.map(t => [t.id, true])),
      jobSites: {},
      workMode: {},
      seniority: expLevelId ? { [expLevelId]: true } : {},
      salaryFromIndex: 0,
      salaryToIndex: 25,
      selectedLocations: [],
      selectedTechnologies,
      specializationIds: [],
      technologyIds: selectedTechnologies.map(t => t.id),
      expLevelIds: expLevelId ? [expLevelId] : [],
      workTypeIds: [],
      siteIds: [],
      locationIds: [],
      salaryFrom: 0,
      salaryTo: 50000,
    };
  }

  onFiltersChange(value: FiltersValue): void {
    this.currentFilterValue = value;
  }

  private buildProfilePayload(): UserProfileCreateDto {
    const expLevelId =
      this.currentFilterValue?.expLevelIds?.[0] ??
      Object.entries(this.currentFilterValue?.seniority ?? {}).find(([, checked]) => checked)?.[0] ??
      '';
    return {
      exp_level_id: expLevelId,
      technology_ids: this.currentFilterValue?.technologyIds ?? [],
    };
  }

  async onSave(): Promise<void> {
    if (!this.currentFilterValue) {
      this.saveError = 'Najpierw wybierz poziom doświadczenia i technologie.';
      return;
    }
    const payload = this.buildProfilePayload();
    if (!payload.exp_level_id) {
      this.saveError = 'Wybierz poziom doświadczenia.';
      return;
    }
    this.isSaving = true;
    this.saveError = null;
    this.saveSuccess = null;
    try {
      let savedProfile: UserProfileDto;
      if (this.profileExists) {
        const updatePayload: UserProfileUpdateDto = {
          exp_level_id: payload.exp_level_id,
          technology_ids: payload.technology_ids,
        };
        savedProfile = await this.userApi.updateMyProfile(updatePayload);
      } else {
        savedProfile = await this.userApi.createMyProfile(payload);
        this.profileExists = true;
      }
      this.patchProfileData(savedProfile);
      if (this.currentFilterValue) this.saveFilters(this.currentFilterValue);
      this.saveSuccess = 'Profil został zapisany.';
      if (this.saveSuccessTimer) clearTimeout(this.saveSuccessTimer);
      this.saveSuccessTimer = setTimeout(() => { this.saveSuccess = null; this.saveSuccessTimer = null; }, 4000);
    } catch {
      this.saveError = 'Nie udało się zapisać profilu.';
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.handleFile(input.files[0]);
  }

  onDragOver(e: DragEvent): void { e.preventDefault(); this.isDragging = true; }
  onDragLeave(e: DragEvent): void { e.preventDefault(); this.isDragging = false; }
  onDrop(e: DragEvent): void {
    e.preventDefault(); this.isDragging = false;
    if (e.dataTransfer?.files.length) this.handleFile(e.dataTransfer.files[0]);
  }

  private handleFile(file: File): void {
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    if (!allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      alert('Dozwolone są tylko pliki PDF, DOC, DOCX!');
      return;
    }
    this.analyzeCV(file);
  }

  private analyzeCV(file: File): void {
    this.isScanning = true; this.scanProgress = 0; this.scanStatus = 'Analiza CV...';

    this.cvApi.uploadCv(file).subscribe({
      next: (techs) => {
        this.scanProgress = 100; this.scanStatus = 'Zakończono!';
        const selectedTechnologies = techs.map(t => ({ id: t.id, name: t.name }));
        setTimeout(() => {
          this.isScanning = false;
          this.scanComplete = true;
          this.currentCvFile = file.name;
          this.filtersFormRef?.patchValue({ selectedTechnologies });
          this.cdr.markForCheck();
        }, 150);
      },
      error: () => {
        this.scanProgress = 100; this.scanStatus = 'Nie udało się przeanalizować CV';
        setTimeout(() => {
          this.isScanning = false;
          this.cdr.markForCheck();
        }, 150);
      },
    });
  }

  removeCv(): void {
    this.scanComplete = false;
    this.currentCvFile = null;
  }
}
