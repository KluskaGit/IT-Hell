import { Component, Inject, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FiltersFormComponent } from '../../app/shared/filters-form/filters-form.component';
import { FiltersInitialState, FiltersValue } from '../../app/shared/filters-form/filters-form.types';
import { AuthService } from '../auth/auth.service';

const STORAGE_KEY = 'cv_analizer_candidate_filters';

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
  currentCvDate: string = '';
  isDragging = false;

  profileForm!: FormGroup;
  savedFilters: FiltersInitialState | null = null;
  private currentFilterValue: FiltersValue | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly authService: AuthService,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.savedFilters = this.loadSavedFilters();
    const profile = this.authService.getProfile();
    this.email = profile.email;
    this.initForm(profile);
    this.setupStudentValidation();
  }

  private initForm(profile: { firstName: string; lastName: string }): void {
    const saved = this.loadSavedFilters();
    this.profileForm = this.fb.group({
      firstName: [profile.firstName, Validators.required],
      lastName: [profile.lastName, Validators.required],
      isStudent: [saved?.isStudent ?? false],
      studyYear: [{ value: saved?.studyYear ?? null, disabled: true }],
      englishLevel: [saved?.englishLevel ?? 'B2'],
    });
  }

  onFiltersChange(value: FiltersValue): void {
    this.currentFilterValue = value;
  }

  private loadSavedFilters(): any {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private saveFilters(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const profileData = this.profileForm.getRawValue();
      const filterData = this.currentFilterValue ?? {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...filterData, ...profileData }));
    } catch { /* ignore */ }
  }

  private setupStudentValidation(): void {
    this.profileForm.get('isStudent')?.valueChanges.subscribe((isStudent: boolean) => {
      const ctrl = this.profileForm.get('studyYear');
      if (isStudent) {
        ctrl?.enable();
        ctrl?.setValidators([Validators.required, Validators.min(1), Validators.max(5)]);
      } else {
        ctrl?.disable();
        ctrl?.clearValidators();
        ctrl?.setValue(null);
      }
      ctrl?.updateValueAndValidity();
    });
  }

  onDragOver(e: DragEvent): void { e.preventDefault(); this.isDragging = true; }
  onDragLeave(e: DragEvent): void { e.preventDefault(); this.isDragging = false; }
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
  }

  removeCv(): void {
    this.currentCvFile = null;
    this.currentCvDate = '';
  }

  onSave(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.saveFilters();
  }

  onLogout(): void {
    this.router.navigate(['/login']);
  }
}
