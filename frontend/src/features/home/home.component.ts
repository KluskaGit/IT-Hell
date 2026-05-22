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

const MAX_CV_SIZE_MB = 10;
const MAX_CV_SIZE_BYTES = MAX_CV_SIZE_MB * 1024 * 1024;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent, FiltersFormComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild(FiltersFormComponent) filtersFormRef?: FiltersFormComponent;

  private readonly destroy$ = new Subject<void>();
  private scanTimers: ReturnType<typeof setTimeout>[] = [];

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
    private readonly cvApi: CvApiService,
    private readonly userApi: UserApiService,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  selectedFile: File | null = null;
  uploadError: string | null = null;
  isDragging = false;
  isScanning = false;
  scanProgress = 0;
  scanStatus = '';
  scanComplete = false;
  isFillingFromProfile = false;
  fillProfileError: string | null = null;

  savedFilters: FiltersInitialState | null = null;

  async fillFromProfile(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.isAuthenticated()) return;

    this.isFillingFromProfile = true;
    this.fillProfileError = null;

    try {
      const profile = await this.userApi.getMyProfile();

      const selectedTechnologies = profile.technologies.map(t => ({
        id: t.id,
        name: t.name,
      }));

      const expLevelId = profile.exp_level?.id ?? '';

      const nextFilters: FiltersInitialState = {
        ...(this.filtersFormRef?.computeValue() ?? {}),
        selectedTechnologies,
        technologies: Object.fromEntries(selectedTechnologies.map(t => [t.id, true])),
        seniority: expLevelId ? { [expLevelId]: true } : {},
      };

      this.savedFilters = nextFilters;
      this.filtersFormRef?.patchValue(nextFilters);
      this.autoFillForm();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Failed to fill form from profile:', error);
      this.fillProfileError = 'Nie udało się pobrać danych z profilu.';
    } finally {
      this.isFillingFromProfile = false;
    }
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.scanTimers.forEach(t => clearTimeout(t));
    this.destroy$.next();
    this.destroy$.complete();
  }

  private saveFilters(value: FiltersValue): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const { itArea, jobSites, workMode, seniority,
              salaryFromIndex, salaryToIndex,
              selectedLocations, selectedTechnologies } = value;
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({
        itArea, jobSites, workMode, seniority,
        salaryFromIndex, salaryToIndex,
        selectedLocations, selectedTechnologies,
      }));
    } catch { /* ignore */ }
  }

  onSubmit(value: FiltersValue): void {
    this.saveFilters(value);
    this.router.navigate(['/offers'], {
      state: { filters: value, cvFileName: this.selectedFile?.name ?? null },
    });
  }

  private autoFillForm(): void {
    const value = this.filtersFormRef?.computeValue();
    if (value) this.saveFilters(value);
  }

  removeFile(e: Event): void {
    e.stopPropagation();
    this.selectedFile = null;
    this.scanComplete = false;
    this.filtersFormRef?.patchValue({ selectedTechnologies: [] });
  }

  private handleFile(file: File): void {
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    if (!allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      this.uploadError = 'Dozwolone są tylko pliki PDF, DOC, DOCX!';
      return;
    }

    if (file.size > MAX_CV_SIZE_BYTES) {
      this.uploadError = `Plik jest za duży. Maksymalny rozmiar to ${MAX_CV_SIZE_MB} MB.`;
      return;
    }

    this.uploadError = null;
    this.selectedFile = file;
    this.analyzeCV(file);
  }

  private analyzeCV(file: File): void {
    this.isScanning = true; this.scanProgress = 0; this.scanStatus = 'Analiza CV...';
    this.scanTimers.push(setTimeout(() => { this.scanProgress = 35; this.cdr.markForCheck(); }, 200));

    this.cvApi.uploadCv(file).pipe(takeUntil(this.destroy$)).subscribe({
      next: (techs) => {
        this.scanProgress = 100; this.scanStatus = 'Zakończono!';
        const selectedTechnologies = techs.map(t => ({ id: t.id, name: t.name }));
        this.scanTimers.push(setTimeout(() => {
          this.isScanning = false;
          this.scanComplete = true;
          this.filtersFormRef?.patchValue({ selectedTechnologies });
          this.autoFillForm();
          this.cdr.markForCheck();
        }, 150));
      },
      error: () => {
        this.scanProgress = 100; this.scanStatus = 'Nie udało się przeanalizować CV';
        this.scanTimers.push(setTimeout(() => {
          this.isScanning = false;
          this.scanComplete = false;
          this.selectedFile = null;
          this.cdr.markForCheck();
        }, 150));
      },
    });
  }

  onDragOver(e: DragEvent): void { e.preventDefault(); this.isDragging = true; }
  onDragLeave(e: DragEvent): void { e.preventDefault(); this.isDragging = false; }
  onDrop(e: DragEvent): void {
    e.preventDefault(); this.isDragging = false;
    if (e.dataTransfer?.files.length) this.handleFile(e.dataTransfer.files[0]);
  }
  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) this.handleFile(input.files[0]);
  }

  get isAuthenticated() { return this.authService.isAuthenticated; }
}
