// /profile page - editing the logged-in user's profile.
// FiltersFormComponent is reused in a simplified mode: only seniority (radio) and technologies.
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
  UserProfileUpdateDto,
} from '../../app/core/services/user-api.service';

// Maximum CV file size - validated before uploading to the backend
const MAX_CV_SIZE_MB    = 10;
const MAX_CV_SIZE_BYTES = MAX_CV_SIZE_MB * 1024 * 1024;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent, FiltersFormComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  // Used for a manual patchValue() when backend data arrives after the form is initialized
  @ViewChild(FiltersFormComponent) filtersFormRef?: FiltersFormComponent;

  email     = '';
  firstName = '';
  lastName  = '';

  currentCvFile: string | null = null;
  currentCvDate = '';
  isDragging    = false;

  isScanning    = false;
  scanProgress  = 0;
  scanStatus    = '';
  scanComplete  = false;

  // savedFilters - passed to the form's [initialFilters] when it initializes
  savedFilters: FiltersInitialState | null = null;
  // currentFilterValue - updated via (filtersChange), used when saving the profile
  private currentFilterValue: FiltersValue | null = null;

  isSaving     = false;
  loadError: string | null = null;
  saveError: string | null = null;
  saveSuccess: string | null = null; // disappears after 3 seconds

  private saveSuccessTimer: ReturnType<typeof setTimeout> | null = null;
  // Array of scan animation timers - cleared in ngOnDestroy to avoid leaks
  private scanTimers: ReturnType<typeof setTimeout>[] = [];
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly authService: AuthService,
    private readonly userApi: UserApiService,
    private readonly cvApi: CvApiService,
    private readonly cdr: ChangeDetectorRef,
    // PLATFORM_ID - needed because localStorage and FileReader don't exist in SSR
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // Step 1: data from the JWT (immediate, no request)
    this.initFromToken();
    // Step 2: full data from the backend (may override the token data)
    await this.loadUserDataFromBackend();
  }

  private initFromToken(): void {
    const profile = this.authService.getProfile();
    this.email     = profile.email;
    this.firstName = profile.firstName ?? '';
    this.lastName  = profile.lastName  ?? '';
  }

  // A 404 from /users/me/profile is expected for new users without a profile
  private async loadUserDataFromBackend(): Promise<void> {
    this.loadError = null;

    try {
      const me = await this.userApi.getMe();
      this.patchUserData(me);

      try {
        const profile = await this.userApi.getMyProfile();
        this.patchProfileData(profile);
      } catch (error) {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.savedFilters = {
            selectedTechnologies: [],
            technologies: {},
            seniority: {},
          };
          this.cdr.markForCheck();
          return;
        }
        throw error; // a different error (e.g. 500) - propagate to the outer catch
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      this.loadError = 'Nie udało się pobrać danych profilu z backendu.';
      this.cdr.detectChanges();
    }
  }

  // ?? this.xxx - keep the token data when the backend returns null
  private patchUserData(me: UserMeDto): void {
    this.email     = me.email      ?? this.email;
    this.firstName = me.first_name ?? this.firstName;
    this.lastName  = me.last_name  ?? this.lastName;
  }

  // Builds savedFilters and currentFilterValue from the profile data.
  // Also called after a successful onSave() to sync the state with the backend response
  private patchProfileData(profile: UserProfileDto): void {
    const selectedTechnologies = (profile.technologies ?? []).map(t => ({
      id: t.id,
      name: t.name,
    }));

    const expLevelId = profile.exp_level?.id ?? '';

    this.savedFilters = {
      selectedTechnologies,
      technologies: Object.fromEntries(selectedTechnologies.map(t => [t.id, true])),
      seniority: expLevelId ? { [expLevelId]: true } : {},
    };
    this.filtersFormRef?.patchValue(this.savedFilters);
    this.cdr.markForCheck();

    // The full FiltersValue needed by buildProfilePayload() - most fields are defaults
    this.currentFilterValue = {
      itArea: {},
      technologies: Object.fromEntries(selectedTechnologies.map(t => [t.id, true])),
      jobSites: {},
      workMode: {},
      seniority: expLevelId ? { [expLevelId]: true } : {},
      salaryFromIndex: 0,
      salaryToIndex: 25,   // default salary slider index (not used in the profile)
      selectedLocations:    [],
      selectedTechnologies,
      specializationIds:    [],
      technologyIds:        selectedTechnologies.map(t => t.id),
      expLevelIds:          expLevelId ? [expLevelId] : [],
      workTypeIds:          [],
      siteIds:              [],
      locationIds:          [],
      salaryFrom: 0,
      salaryTo:   50000,
    };

    // raw_cv !== null means the user already has a CV uploaded in the backend
    this.currentCvFile = profile.raw_cv !== null ? 'Plik CV' : null;
    this.currentCvDate = '';
  }

  onFiltersChange(value: FiltersValue): void {
    this.currentFilterValue = value;
  }

  // expLevelIds[0] because the profile supports only one level (singleExpLevelSelection = true)
  private buildProfilePayload(): { exp_level_id: string; technology_ids: string[] } {
    return {
      exp_level_id:   this.currentFilterValue?.expLevelIds?.[0] ?? '',
      technology_ids: this.currentFilterValue?.technologyIds    ?? [],
    };
  }

  // preventDefault() required so the browser doesn't open the file in its own window
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = false;
  }

  // Handles dropping a file on the drag&drop zone - takes the first file from dataTransfer
  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = false;
    if (e.dataTransfer?.files.length) this.handleFile(e.dataTransfer.files[0]);
  }

  // input.value = '' clears the input - without it the same file won't fire the change event again
  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) this.handleFile(input.files[0]);
    input.value = '';
  }

  // Validates the CV file (extension and size) and starts the upload if it passes.
  // Validation errors are shown via saveError in the template
  private handleFile(file: File): void {
    const allowed = ['.pdf', '.doc', '.docx'];
    const name    = file.name.toLowerCase();

    if (!allowed.some(ext => name.endsWith(ext))) {
      this.saveError = 'Dozwolone są tylko pliki PDF, DOC, DOCX!';
      return;
    }

    if (file.size > MAX_CV_SIZE_BYTES) {
      this.saveError = `Plik jest za duży. Maksymalny rozmiar to ${MAX_CV_SIZE_MB} MB.`;
      return;
    }

    this.saveError     = null;
    this.currentCvFile = file.name;
    this.currentCvDate = 'Właśnie teraz';
    this.analyzeCV(file);
  }

  // The progress bar animation is fake - the API returns no progress, setTimeout simulates the stages
  private analyzeCV(file: File): void {
    this.isScanning   = true;
    this.scanProgress = 0;
    this.scanStatus   = 'Analiza CV...';
    this.saveError    = null;

    // Fake 35% progress after 200ms - visual feedback that something is happening before the API responds
    this.scanTimers.push(setTimeout(() => {
      this.scanProgress = 35;
    }, 200));

    this.cvApi.uploadCv(file).pipe(takeUntil(this.destroy$)).subscribe({
      next: (techs) => {
        this.scanProgress = 100;
        this.scanStatus   = 'Zakończono!';

        const selectedTechnologies = techs.map(t => ({
          id: t.id,
          name: t.name,
        }));

        // 150ms delay before hiding the bar - so the user gets to see 100%
        this.scanTimers.push(setTimeout(() => {
          this.isScanning   = false;
          this.scanComplete = true;

          // Keep the current filters (seniority) and override only the technologies from the CV.
          // Spread savedFilters ?? {} guards against the profile not being loaded earlier
          const nextFilters: FiltersInitialState = {
            ...(this.savedFilters ?? {}),
            selectedTechnologies,
            technologies: Object.fromEntries(selectedTechnologies.map(t => [t.id, true])),
          };

          this.savedFilters = nextFilters;
          // Update the form with the new technologies
          this.filtersFormRef?.patchValue(nextFilters);

          // Sync currentFilterValue with the new technologies so onSave() has up-to-date data
          if (this.currentFilterValue) {
            this.currentFilterValue = {
              ...this.currentFilterValue,
              selectedTechnologies,
              technologies:  Object.fromEntries(selectedTechnologies.map(t => [t.id, true])),
              technologyIds: selectedTechnologies.map(t => t.id),
            };
          }

          // Format the upload date in Polish (e.g. "28.05.2026, 14:35")
          this.currentCvDate = new Date().toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
        }, 150));
      },
      error: (error) => {
        console.error('CV analysis failed:', error);
        this.scanProgress = 100;
        this.scanStatus   = 'Nie udało się przeanalizować CV';

        this.scanTimers.push(setTimeout(() => {
          this.isScanning   = false;
          this.scanComplete = false;
          this.saveError    = 'Nie udało się przeanalizować CV.';
        }, 150));
      },
    });
  }

  // Removes the uploaded CV info from the view (does not send a DELETE request to the backend)
  removeCv(): void {
    this.currentCvFile = null;
    this.currentCvDate = '';
    this.scanComplete  = false;
  }

  async onSave(): Promise<void> {
    if (!this.currentFilterValue) {
      this.saveError = 'Najpierw wybierz poziom doświadczenia i technologie.';
      return;
    }

    const payload = this.buildProfilePayload();

    // Client-side validation - the backend validates too but we give fast feedback
    if (!payload.exp_level_id) {
      this.saveError = 'Wybierz poziom doświadczenia.';
      return;
    }

    this.isSaving     = true;
    this.saveError    = null;
    this.saveSuccess  = null;
    // Clear the previous success timer so it doesn't hide the new message too early
    clearTimeout(this.saveSuccessTimer ?? undefined);

    try {
      const updatePayload: UserProfileUpdateDto = {
        exp_level_id:   payload.exp_level_id,
        technology_ids: payload.technology_ids,
      };
      // PUT /v1/users/me/profile - returns the updated UserProfileDto
      const savedProfile = await this.userApi.updateMyProfile(updatePayload);
      // Sync the local state with the backend response (instead of trusting the local state)
      this.patchProfileData(savedProfile);
      this.saveSuccess = 'Profil został zapisany.';
      // The success message disappears automatically after 3 seconds
      this.saveSuccessTimer = setTimeout(() => {
        this.saveSuccess = null;
        this.cdr.detectChanges();
      }, 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
      this.saveError = 'Nie udało się zapisać profilu.';
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    this.scanTimers.forEach(t => clearTimeout(t));
    clearTimeout(this.saveSuccessTimer ?? undefined);
    // destroy$ cancels uploadCv if the user leaves the page during the upload
    this.destroy$.next();
    this.destroy$.complete();
  }
}
