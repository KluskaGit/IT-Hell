import { Component, Inject, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FiltersFormComponent } from '../../app/shared/filters-form/filters-form.component';
import { FiltersInitialState, FiltersValue } from '../../app/shared/filters-form/filters-form.types';
import { AuthService } from '../auth/auth.service';

const STORAGE_KEY = 'cv_analizer_candidate_filters';
const PROFILE_STORAGE_KEY = 'profile_basic_data';

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

  profileForm!: FormGroup;
  savedFilters: FiltersInitialState | null = null;
  private currentFilterValue: FiltersValue | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.savedFilters = this.loadSavedFilters();

    const profile = this.authService.getProfile();
    this.email = profile.email;

    this.initForm(profile);
    this.loadSavedProfileData();
  }

  private initForm(profile: { firstName: string; lastName: string }): void {
    this.profileForm = this.fb.group({
      firstName: [profile.firstName, Validators.required],
      lastName: [profile.lastName, Validators.required],
    });
  }

  private loadSavedFilters(): FiltersInitialState | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private loadSavedProfileData(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw);
      this.profileForm.patchValue({
        firstName: saved.firstName ?? this.profileForm.get('firstName')?.value,
        lastName: saved.lastName ?? this.profileForm.get('lastName')?.value,
      });

      this.currentCvFile = saved.currentCvFile ?? null;
      this.currentCvDate = saved.currentCvDate ?? '';
    } catch {
      // ignore
    }
  }

  onFiltersChange(value: FiltersValue): void {
    this.currentFilterValue = value;
  }

  private saveProfileData(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify({
          ...this.profileForm.getRawValue(),
          currentCvFile: this.currentCvFile,
          currentCvDate: this.currentCvDate,
        })
      );
    } catch {
      // ignore
    }
  }

  private saveFilters(): void {
    if (!isPlatformBrowser(this.platformId) || !this.currentFilterValue) return;
    try {
      const {
        technologies,
        seniority,
      } = this.currentFilterValue;

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...(this.savedFilters ?? {}),
          technologies,
          seniority,
        })
      );
    } catch {
      // ignore
    }
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

    this.saveProfileData();
    this.saveFilters();
  }

  async onLogout(): Promise<void> {
    await this.authService.logout();
  }
}