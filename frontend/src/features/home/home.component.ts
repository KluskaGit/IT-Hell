import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../app/shared/navbar/navbar.component';
import { FooterComponent } from '../../app/shared/footer/footer.component';
import { FiltersFormComponent } from '../../app/shared/filters-form/filters-form.component';
import { FiltersInitialState, FiltersValue } from '../../app/shared/filters-form/filters-form.types';
import { CvApiService } from '../../app/core/services/cv-api.service';
import { AuthService } from '../auth/auth.service';
import { UserApiService } from '../../app/core/services/user-api.service';

const STORAGE_KEY = 'cv_analizer_candidate_filters';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent, FiltersFormComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  @ViewChild(FiltersFormComponent) filtersFormRef?: FiltersFormComponent;

  constructor(
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly cvApi: CvApiService,
    private readonly authService: AuthService,
    private readonly userApi: UserApiService,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  selectedFile: File | null = null;
  isDragging = false;
  isScanning = false;
  scanProgress = 0;
  scanStatus = '';
  scanComplete = false;
  isFillingFromProfile = false;
  fillProfileError: string | null = null;

  savedFilters: FiltersInitialState | null = null;

  ngOnInit(): void {}

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
        ...(this.savedFilters ?? this.loadSavedFilters() ?? {}),
        selectedTechnologies,
        technologies: Object.fromEntries(selectedTechnologies.map(t => [t.id, true])),
        seniority: expLevelId ? { [expLevelId]: true } : {},
      };

      this.savedFilters = nextFilters;
      this.filtersFormRef?.patchValue(nextFilters);
      this.autoFillForm();
      this.cdr.markForCheck();
    } catch {
      this.fillProfileError = 'Nie udało się pobrać danych z profilu.';
    } finally {
      this.isFillingFromProfile = false;
    }
  }

  private loadSavedFilters(): FiltersInitialState | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private saveFilters(value: FiltersValue): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const { itArea, jobSites, workMode, seniority,
              salaryFromIndex, salaryToIndex,
              selectedLocations, selectedTechnologies } = value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
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

  get isAuthenticated() { return this.authService.isAuthenticated; }

  async submitAndSignup(): Promise<void> {
    const value = this.filtersFormRef?.computeValue();
    if (value) this.saveFilters(value);
    await this.authService.register();
  }

  async saveToProfileAndSearch(): Promise<void> {
    const value = this.filtersFormRef?.computeValue();
    if (!value) return;
    this.saveFilters(value);

    const payload = {
      exp_level_id: value.expLevelIds[0] ?? '',
      technology_ids: value.technologyIds,
    };

    if (payload.exp_level_id || payload.technology_ids.length) {
      try {
        await this.userApi.updateMyProfile(payload);
      } catch {
        try { await this.userApi.createMyProfile(payload); } catch { /* ignoruj, i tak nawigujemy */ }
      }
    }

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
    const saved = this.loadSavedFilters();
    if (saved) this.filtersFormRef?.patchValue(saved, saved.selectedLocations);
  }

  private handleFile(file: File): void {
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    if (!allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      alert('Dozwolone są tylko pliki PDF, DOC, DOCX!');
      return;
    }
    this.selectedFile = file;
    this.analyzeCV(file);
  }

  private analyzeCV(file: File): void {
    this.isScanning = true; this.scanProgress = 0; this.scanStatus = 'Analiza CV...';
    setTimeout(() => { this.scanProgress = 35; this.cdr.markForCheck(); }, 200);

    this.cvApi.uploadCv(file).subscribe({
      next: (techs) => {
        this.scanProgress = 100; this.scanStatus = 'Zakończono!';
        const selectedTechnologies = techs.map(t => ({ id: t.id, name: t.name }));
        setTimeout(() => {
          this.isScanning = false;
          this.scanComplete = true;
          this.filtersFormRef?.patchValue({ selectedTechnologies });
          this.autoFillForm();
          this.cdr.markForCheck();
        }, 150);
      },
      error: () => {
        this.scanProgress = 100; this.scanStatus = 'Nie udało się przeanalizować CV';
        setTimeout(() => {
          this.isScanning = false;
          this.scanComplete = false;
          this.selectedFile = null;
          this.cdr.markForCheck();
        }, 150);
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
}
