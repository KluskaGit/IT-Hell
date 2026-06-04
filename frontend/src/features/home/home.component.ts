// Home page component (/home) - the application entry point for candidates.
// Responsibilities:
//   1. Filter form (technologies, experience, location...) - delegated to FiltersFormComponent
//   2. CV upload and analysis (POST /v1/cv/upload via CvApiService) - fills technologies automatically
//   3. The "Fill from profile" button - fetches data from GET /v1/users/me/profile (UserApiService)
//   4. Navigation to /offers with the filters in history.state (router.navigate + state)
//   5. Saving filters to localStorage under FILTERS_STORAGE_KEY (see: filters-form.types.ts)
//
// Related files:
//   home.component.html   - template with the filter form and the CV dropzone
//   home.component.css    - page styles
//   filters-form.component.ts  - the whole filter form as a reusable component
//   cv-api.service.ts     - CV upload to the backend (POST /v1/cv/upload)
//   user-api.service.ts   - fetching the user profile (GET /v1/users/me/profile)
//   filters-form.types.ts - the FiltersValue, FiltersInitialState, FILTERS_STORAGE_KEY types

import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NavbarComponent } from '../../app/shared/navbar/navbar.component';
import { FooterComponent } from '../../app/shared/footer/footer.component';
import { FiltersFormComponent } from '../../app/shared/filters-form/filters-form.component';
import { FiltersInitialState, FiltersValue, FILTERS_STORAGE_KEY } from '../../app/shared/filters-form/filters-form.types';
import { AuthService } from '../auth/auth.service';
import { CvApiService } from '../../app/core/services/cv-api.service';
import { UserApiService } from '../../app/core/services/user-api.service';

// CV file size limit - defined outside the class as a module constant (does not change at runtime).
// 10 MB is a compromise: most CVs in PDF/DOC fit within this limit,
// while files that are too large slow down upload and analysis on the backend.
// MAX_CV_SIZE_BYTES is the converted value to compare against file.size (which is in bytes)
const MAX_CV_SIZE_MB = 10;
const MAX_CV_SIZE_BYTES = MAX_CV_SIZE_MB * 1024 * 1024;

@Component({
  selector: 'app-home',
  standalone: true,
  // Standalone component - no NgModule required. Imports only what it uses directly.
  // CommonModule: *ngIf, *ngFor, AsyncPipe, etc.
  // RouterModule: routerLink in the template
  // NavbarComponent, FooterComponent: shared page layout elements
  // FiltersFormComponent: the whole filter form (the "Search offers" section)
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent, FiltersFormComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {

  // Reference to the FiltersFormComponent instance in the template.
  // Used to call the component's methods directly:
  //   filtersFormRef?.computeValue() - read the current filters before saving
  //   filtersFormRef?.patchValue(...)  - programmatically set the form values,
  //                                     e.g. after CV analysis or "Fill from profile"
  @ViewChild(FiltersFormComponent) filtersFormRef?: FiltersFormComponent;

  // Subject for managing the RxJS subscription lifecycle.
  // takeUntil(this.destroy$) in every subscription makes RxJS automatically
  // unsubscribe from the stream when destroy$.next() is called in ngOnDestroy.
  // Without it, subscriptions would live on after the component is destroyed (memory leak).
  private readonly destroy$ = new Subject<void>();

  // Array of setTimeout ids - kept so they can be cancelled in ngOnDestroy.
  // analyzeCV() creates several timers (a fake progress animation) that must be
  // cleared if the user leaves the page before the animation finishes.
  // ReturnType<typeof setTimeout> instead of "number" - compatibility with Node.js (returns a Timeout object)
  private scanTimers: ReturnType<typeof setTimeout>[] = [];

  constructor(
    // Router - for navigating to /offers after clicking "Search offers" (onSubmit)
    private readonly router: Router,
    // AuthService - checks whether the user is logged in (Keycloak).
    // Used by the isAuthenticated getter to conditionally show "Fill from profile"
    private readonly authService: AuthService,
    // ChangeDetectorRef - manually notifying Angular that the state changed.
    // Needed because operations inside setTimeout / API callbacks are not detected automatically
    // by Angular change detection (they don't go through zone.js in some cases)
    private readonly cdr: ChangeDetectorRef,
    // CvApiService - uploads the CV file to the backend (POST /v1/cv/upload).
    // The backend returns a list of detected technologies, which are placed into the filter automatically
    private readonly cvApi: CvApiService,
    // UserApiService - fetches the user profile from the backend (GET /v1/users/me/profile).
    // Used by fillFromProfile() to pre-populate the filter form
    private readonly userApi: UserApiService,
    // PLATFORM_ID - the Angular token identifying the runtime platform (browser/server).
    // Used with isPlatformBrowser() to guard against SSR (Server Side Rendering):
    // localStorage and FileReader don't exist in Node.js - without the guard the app crashes
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  // The selected CV file - set after validation in handleFile(), cleared by removeFile()
  selectedFile: File | null = null;
  // Upload error message (e.g. wrong format, file too large)
  uploadError: string | null = null;
  // Drag&drop flag - true while the user drags a file over the dropzone
  isDragging = false;
  // Scanning flag - true from the moment the file is sent to the API until the animation ends
  isScanning = false;
  // Scan animation progress (0-100) - drives the progress bar in the template
  scanProgress = 0;
  // Scan status text - changes in stages ("Analiza CV...", "Zakończono!")
  scanStatus = '';
  // Completion flag - true once the API returned a result and the animation finished
  scanComplete = false;
  // "Fill from profile" in-progress flag - blocks repeated clicks
  isFillingFromProfile = false;
  // Error message when fetching the profile from the backend failed
  fillProfileError: string | null = null;

  // Filter state passed to FiltersFormComponent as [initialFilters].
  // Set by fillFromProfile() after fetching data from the API.
  // Type FiltersInitialState (see: filters-form.types.ts) - partial, not all fields must be filled
  savedFilters: FiltersInitialState | null = null;

  // Fetches the user's profile data and pre-populates the filter form.
  // Called from HTML: (profileFillClicked)="fillFromProfile()" on app-filters-form.
  // Available only to logged-in users (isPlatformBrowser + isAuthenticated guard).
  // async/await instead of .subscribe() because UserApiService.getMyProfile() returns a Promise
  async fillFromProfile(): Promise<void> {
    // isPlatformBrowser - guard against SSR (Node.js has no localStorage/Keycloak)
    if (!isPlatformBrowser(this.platformId) || !this.isAuthenticated()) return;

    this.isFillingFromProfile = true;
    this.fillProfileError = null;

    try {
      // GET /v1/users/me/profile - fetches technologies and experience level from the backend.
      // Throws a 404 if the user never saved a profile
      const profile = await this.userApi.getMyProfile();

      // Map technologies from the API format ({ id, name, ...other fields }) to LocationItem { id, name }.
      // FiltersFormComponent (TechPicker) expects exactly this format
      const selectedTechnologies = (profile.technologies ?? []).map(t => ({
        id: t.id,
        name: t.name,
      }));

      // exp_level may be null (if the user did not choose one) - ?? '' returns an empty string
      const expLevelId = profile.exp_level?.id ?? '';

      // Build the new filter state: spread the current filters from the form,
      // overriding only technologies and seniority with profile data.
      // computeValue() reads the current FiltersFormComponent state (location, salary, etc.)
      // so data the user already set manually is not wiped.
      // technologies: Object.fromEntries(...) - the old { id: true } format for backward compat.
      // selectedTechnologies - the new array-of-objects { id, name } format for the TechPicker.
      // Both formats are described in FiltersInitialState in filters-form.types.ts
      const nextFilters: FiltersInitialState = {
        ...(this.filtersFormRef?.computeValue() ?? {}),
        selectedTechnologies,
        technologies: Object.fromEntries(selectedTechnologies.map(t => [t.id, true])),
        seniority: expLevelId ? { [expLevelId]: true } : {},
      };

      // savedFilters is an @Input for FiltersFormComponent - changing the value triggers another
      // patchValue in FiltersFormComponent.ngOnChanges() (see: filters-form.component.ts)
      this.savedFilters = nextFilters;
      // Direct patch - a faster path than waiting for ngOnChanges
      this.filtersFormRef?.patchValue(nextFilters);
      // Save to localStorage so the state survives navigation to /offers and back
      this.autoFillForm();
      // Manually notify Angular CD - required because this is an async callback
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Failed to fill form from profile:', error);
      this.fillProfileError = 'Nie udało się pobrać danych z profilu.';
    } finally {
      this.isFillingFromProfile = false;
    }
  }

  ngOnInit(): void {
    // Browser-only block - guard against SSR.
    // On the server there are no router.events to subscribe to
    if (!isPlatformBrowser(this.platformId)) return;
    // Subscribe to router events - calls markForCheck() on every navigation.
    // Required when the component uses OnPush change detection and the router changes the URL
    // without physically destroying and recreating the component
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    // Cancel all active timers (setTimeout from analyzeCV).
    // Without this a timer callback may run after the component is destroyed
    // and try to change the state of a non-existent component (an Angular error)
    this.scanTimers.forEach(t => clearTimeout(t));
    // Signal all takeUntil(destroy$) - completes every active RxJS subscription
    this.destroy$.next();
    // Close the Subject - releases RxJS internal resources
    this.destroy$.complete();
  }

  // Saves the current filter state to localStorage.
  // Only raw boolean objects and indexes are saved (not the computed ID arrays),
  // because those are derived dynamically by computeValue() on every read.
  // FILTERS_STORAGE_KEY (see: filters-form.types.ts) is a shared key used by
  // /offers and /profile - changing filters on /home is visible on /offers after navigation
  private saveFilters(value: FiltersValue): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      // Destructure only the fields that make sense in localStorage.
      // We don't save specializationIds / technologyIds etc. because they are computed dynamically.
      // selectedLocations / selectedTechnologies are saved as { id, name } objects
      // so the picker can restore its state without looking IDs up in the backend again
      const { itArea, jobSites, workMode, seniority,
              salaryFromIndex, salaryToIndex,
              selectedLocations, selectedTechnologies } = value;
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({
        itArea, jobSites, workMode, seniority,
        salaryFromIndex, salaryToIndex,
        selectedLocations, selectedTechnologies,
      }));
    } catch { /* ignore - localStorage may be unavailable (private mode, no space) */ }
  }

  // Called via (applyClicked) from FiltersFormComponent when the user clicks "Search offers".
  // Saves the filters to localStorage and navigates to /offers with the filters in history.state.
  // history.state (state: { filters, cvFileName }) is read in offers.component.ts
  // in the route.queryParamMap subscription - see the source priority logic in offers.component.ts
  onSubmit(value: FiltersValue): void {
    this.saveFilters(value);
    this.router.navigate(['/offers'], {
      // cvFileName - the CV file name (if uploaded) passed to /offers to show a badge
      state: { filters: value, cvFileName: this.selectedFile?.name ?? null },
    });
  }

  // Private method - saves the current form state to localStorage after a programmatic patch.
  // Called after fillFromProfile() and after CV analysis so localStorage is always up to date.
  // Without it: fillFromProfile() would change the form but localStorage would keep the old state,
  // and on the next /offers->/home navigation the form state would roll back
  private autoFillForm(): void {
    const value = this.filtersFormRef?.computeValue();
    if (value) this.saveFilters(value);
  }

  // Removes the uploaded CV file and resets the analysis state.
  // e.stopPropagation() - the "Remove" button is inside the dropzone element which has a (click).
  // Without stopPropagation, clicking "Remove" would also trigger the dropzone click -> open the dialog
  removeFile(e: Event): void {
    e.stopPropagation();
    this.selectedFile = null;
    this.scanComplete = false;
    // Clear the technologies detected from the CV in the filter form
    this.filtersFormRef?.patchValue({ selectedTechnologies: [] });
  }

  // Validates the file and starts the analysis.
  // Checks the format and size BEFORE sending to the API - fast feedback for the user.
  // file.name.toLowerCase() - case-insensitive comparison (important on Windows where "CV.PDF" is OK)
  private handleFile(file: File): void {
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    if (!allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      this.uploadError = 'Dozwolone są tylko pliki PDF, DOC, DOCX!';
      return;
    }

    // file.size is in bytes - compared against MAX_CV_SIZE_BYTES (10 * 1024 * 1024)
    if (file.size > MAX_CV_SIZE_BYTES) {
      this.uploadError = `Plik jest za duży. Maksymalny rozmiar to ${MAX_CV_SIZE_MB} MB.`;
      return;
    }

    this.uploadError = null;
    this.selectedFile = file;
    // The file passed validation - start the upload and the scanning animation
    this.analyzeCV(file);
  }

  // Sends the CV file to the API and manages the scanning progress animation.
  // The backend (POST /v1/cv/upload) does not return real-time progress,
  // so the animation is "fake" - setTimeout jumps to 35% after 200ms
  // so the user sees something happening instead of staring at a 0% bar.
  // A 150ms delay after the API response gives time to show "100% Zakończono!"
  // before the UI switches to the success banner
  private analyzeCV(file: File): void {
    this.isScanning = true; this.scanProgress = 0; this.scanStatus = 'Analiza CV...';
    // Timer 1: after 200ms jump to 35% - signals that the API is working
    this.scanTimers.push(setTimeout(() => { this.scanProgress = 35; this.cdr.markForCheck(); }, 200));

    // Send the file to the backend - CvApiService.uploadCv() returns Observable<LookupDto[]>
    // takeUntil(destroy$) - cancels the request when the user navigates away from /home
    this.cvApi.uploadCv(file).pipe(takeUntil(this.destroy$)).subscribe({
      next: (techs) => {
        // The API responded successfully - set 100% and wait 150ms so the user sees it
        this.scanProgress = 100; this.scanStatus = 'Zakończono!';
        // Map the API response (LookupDto[]) to LocationItem[] { id, name }
        // the format the TechPicker needs - see: tech-picker.component.ts
        const selectedTechnologies = techs.map(t => ({ id: t.id, name: t.name }));
        // Timer 2: after 150ms switch the UI to the success banner and inject technologies into the form
        this.scanTimers.push(setTimeout(() => {
          this.isScanning = false;
          this.scanComplete = true;
          // Programmatically set the technologies detected from the CV in FiltersFormComponent
          this.filtersFormRef?.patchValue({ selectedTechnologies });
          // Save to localStorage so the new technologies survive navigation to /offers
          this.autoFillForm();
          this.cdr.markForCheck();
        }, 150));
      },
      error: () => {
        // API error - set 100% and an error message, then reset the UI
        this.scanProgress = 100; this.scanStatus = 'Nie udało się przeanalizować CV';
        this.scanTimers.push(setTimeout(() => {
          this.isScanning = false;
          this.scanComplete = false;
          // Remove the file - the user has to try again
          this.selectedFile = null;
          this.cdr.markForCheck();
        }, 150));
      },
    });
  }

  // Drag&drop handlers for the CV dropzone.
  // e.preventDefault() in onDragOver IS REQUIRED - without it the browser ignores (drop).
  // The browser's default behavior: open the file directly - preventDefault blocks that.
  // isDragging controls the .dragging CSS class on the dropzone (visual highlight)
  onDragOver(e: DragEvent): void { e.preventDefault(); this.isDragging = true; }
  onDragLeave(e: DragEvent): void { e.preventDefault(); this.isDragging = false; }
  onDrop(e: DragEvent): void {
    e.preventDefault(); this.isDragging = false;
    // dataTransfer?.files[0] - the first dropped file (we only handle one)
    if (e.dataTransfer?.files.length) this.handleFile(e.dataTransfer.files[0]);
  }

  // Handler for the native <input type="file"> (hidden, triggered by clicking the dropzone).
  // e.target as HTMLInputElement - TypeScript doesn't know the exact EventTarget type
  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) this.handleFile(input.files[0]);
  }

  // Getter delegated to AuthService - returns the isAuthenticated function from Keycloak.
  // A getter (not a property) because authService.isAuthenticated is a function, not a boolean value.
  // Used in the template: *ngIf="isAuthenticated()" to conditionally show "Fill from profile"
  get isAuthenticated() { return this.authService.isAuthenticated; }
}
