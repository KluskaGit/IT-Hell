import { Component, Inject, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

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

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FiltersFormComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  @ViewChild(FiltersFormComponent) filtersFormRef?: FiltersFormComponent;

  email = '';
  currentCvFile: string | null = null;
  currentCvDate = '';
  isDragging = false;

  isScanning = false;
  scanProgress = 0;
  scanStatus = '';
  scanComplete = false;

  profileForm!: FormGroup;
  savedFilters: FiltersInitialState | null = null;
  private currentFilterValue: FiltersValue | null = null;

  isSaving = false;
  loadError: string | null = null;
  saveError: string | null = null;
  saveSuccess: string | null = null;

  private profileExists = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly userApi: UserApiService,
    private readonly cvApi: CvApiService,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.initFormFromToken();
    await this.loadUserDataFromBackend();
  }

  private initFormFromToken(): void {
    const profile = this.authService.getProfile();

    this.email = profile.email;
    this.profileForm = this.fb.group({
      firstName: [profile.firstName, Validators.required],
      lastName: [profile.lastName, Validators.required],
    });
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
          this.savedFilters = {
            selectedTechnologies: [],
            technologies: {},
            seniority: {},
          };
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Błąd podczas pobierania danych użytkownika:', error);
      this.loadError = 'Nie udało się pobrać danych profilu z backendu.';
    }
  }

  private patchUserData(me: UserMeDto): void {
    this.email = me.email ?? this.email;

    this.profileForm.patchValue({
      firstName: me.first_name ?? this.profileForm.get('firstName')?.value ?? '',
      lastName: me.last_name ?? this.profileForm.get('lastName')?.value ?? '',
    });
  }

  private patchProfileData(profile: UserProfileDto): void {
    const selectedTechnologies = profile.technologies.map(t => ({
      id: t.id,
      name: t.name,
    }));

    const expLevelId = profile.exp_level?.id ?? '';

    this.savedFilters = {
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

    this.currentCvFile = null;
    this.currentCvDate = '';
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
      technology_ids: this.currentFilterValue?.technologyIds ?? []
    };
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = false;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = false;
    if (e.dataTransfer?.files.length) this.handleFile(e.dataTransfer.files[0]);
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) this.handleFile(input.files[0]);
  }

  private handleFile(file: File): void {
    const allowed = ['.pdf', '.doc', '.docx'];
    const name = file.name.toLowerCase();

    if (!allowed.some(ext => name.endsWith(ext))) {
      alert('Dozwolone są tylko pliki PDF, DOC, DOCX!');
      return;
    }

    this.currentCvFile = file.name;
    this.currentCvDate = 'Właśnie teraz';
    this.analyzeCV(file);
  }

  private analyzeCV(file: File): void {
    this.isScanning = true;
    this.scanProgress = 0;
    this.scanStatus = 'Analiza CV...';
    this.saveError = null;

    setTimeout(() => {
      this.scanProgress = 35;
    }, 200);

    this.cvApi.uploadCv(file).subscribe({
      next: (techs) => {
        this.scanProgress = 100;
        this.scanStatus = 'Zakończono!';

        const selectedTechnologies = techs.map(t => ({
          id: t.id,
          name: t.name,
        }));

        setTimeout(() => {
          this.isScanning = false;
          this.scanComplete = true;

          const nextFilters: FiltersInitialState = {
            ...(this.savedFilters ?? {}),
            selectedTechnologies,
            technologies: Object.fromEntries(selectedTechnologies.map(t => [t.id, true])),
          };

          this.savedFilters = nextFilters;
          this.filtersFormRef?.patchValue(nextFilters);

          if (this.currentFilterValue) {
            this.currentFilterValue = {
              ...this.currentFilterValue,
              selectedTechnologies,
              technologies: Object.fromEntries(selectedTechnologies.map(t => [t.id, true])),
              technologyIds: selectedTechnologies.map(t => t.id),
            };
          }

          this.currentCvDate = 'Przeanalizowano przed chwilą';
        }, 150);
      },
      error: (error) => {
        console.error('Błąd analizy CV:', error);
        this.scanProgress = 100;
        this.scanStatus = 'Nie udało się przeanalizować CV';

        setTimeout(() => {
          this.isScanning = false;
          this.scanComplete = false;
          this.saveError = 'Nie udało się przeanalizować CV.';
        }, 150);
      },
    });
  }

  removeCv(): void {
    this.currentCvFile = null;
    this.currentCvDate = '';
    this.scanComplete = false;
  }

  async onSave(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

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
          technology_ids: payload.technology_ids
        };
        savedProfile = await this.userApi.updateMyProfile(updatePayload);
      } else {
        savedProfile = await this.userApi.createMyProfile(payload);
        this.profileExists = true;
      }

      this.patchProfileData(savedProfile);
      this.saveSuccess = 'Profil został zapisany.';
    } catch (error) {
      console.error('Błąd podczas zapisu profilu:', error);
      this.saveError = 'Nie udało się zapisać profilu.';
    } finally {
      this.isSaving = false;
    }
  }

  async onLogout(): Promise<void> {
    await this.authService.logout();
  }
}