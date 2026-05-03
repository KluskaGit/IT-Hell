import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FiltersFormComponent } from '../../app/shared/filters-form/filters-form.component';
import { FiltersInitialState, FiltersValue } from '../../app/shared/filters-form/filters-form.types';
import { AuthService } from '../auth/auth.service';

const STORAGE_KEY = 'cv_analizer_candidate_filters';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FiltersFormComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  @ViewChild(FiltersFormComponent) filtersFormRef?: FiltersFormComponent;

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  selectedFile: File | null = null;
  isDragging = false;
  isScanning = false;
  scanProgress = 0;
  scanStatus = '';
  scanComplete = false;

  savedFilters: FiltersInitialState | null = null;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.savedFilters = this.loadSavedFilters();
    this.router.events.subscribe(() => {
      this.cdr.markForCheck();
    });
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
      const { itArea, technologies, jobSites, workMode, seniority,
              salaryFromIndex, salaryToIndex,
              selectedLocations } = value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        itArea, technologies, jobSites, workMode, seniority,
        salaryFromIndex, salaryToIndex,
        selectedLocations,
      }));
    } catch { /* ignore */ }
  }

  onSubmit(value: FiltersValue): void {
    this.saveFilters(value);
    this.router.navigate(['/offers'], {
      state: { filters: value, cvFileName: this.selectedFile?.name ?? null },
    });
  }

  submitAndSignup(): void {
    const value = this.filtersFormRef?.computeValue();
    if (value) this.saveFilters(value);
    this.router.navigate(['/login']);
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
    this.simulateScanning();
  }

  private simulateScanning(): void {
    this.isScanning = true; this.scanProgress = 0; this.scanStatus = 'Analiza CV...';
    setTimeout(() => { this.scanProgress = 35; }, 200);
    setTimeout(() => { this.scanProgress = 70; }, 500);
    setTimeout(() => {
      this.scanProgress = 100; this.scanStatus = 'Zakończono!';
      setTimeout(() => { this.isScanning = false; this.scanComplete = true; this.autoFillForm(); }, 150);
    }, 800);
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
  get username() { return this.authService.username; }
  async logout(): Promise<void> { await this.authService.logout(); }
}
