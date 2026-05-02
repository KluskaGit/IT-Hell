import { Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProfileApiService } from '../../core/services/profile-api.service';
import { ApiService } from '../../core/services/api.service';
import { UserRead, UserProfileResponse } from '../../core/models/user.model';
import { LookupRead } from '../public-job-board/models/lookup.model';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule],
  template: `
    <div class="max-w-3xl mx-auto space-y-6">
      
      <!-- Header -->
      <div class="bg-white px-4 py-5 shadow sm:rounded-lg sm:px-6">
        <h2 class="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
          Mój Profil
        </h2>
        <p class="mt-1 text-sm text-gray-500">
          Zarządzaj swoim doświadczeniem i umiejętnościami w systemie IT-Hell.
        </p>
      </div>

      <!-- Main Profile Form -->
      <div class="bg-white px-4 py-5 shadow sm:rounded-lg sm:px-6">
        @if (isLoading()) {
          <div class="text-center py-4">Ładowanie profilu...</div>
        } @else {
          <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="space-y-6">

            <!-- Personal info (Disabled) -->
            <div>
              <h3 class="text-lg font-medium leading-6 text-gray-900 border-b pb-2 mb-4">Informacje podstawowe</h3>
              <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Nazwa użytkownika</label>
                  <div class="mt-1">
                    <input type="text" value="{{ user()?.first_name }} {{ user()?.last_name }}" disabled
                      class="block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700">Adres Email</label>
                  <div class="mt-1">
                    <input type="email" [value]="user()?.email" disabled
                      class="block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                  </div>
                </div>
              </div>
            </div>

            <!-- Profile details -->
            <div>
              <h3 class="text-lg font-medium leading-6 text-gray-900 border-b pb-2 mb-4">Preferencje Zawodowe</h3>
              
              <!-- Exp Level -->
              <div class="mb-4">
                <label for="expLevel" class="block text-sm font-medium text-gray-700">Poziom Doświadczenia</label>
                <div class="mt-1">
                  <select id="expLevel" formControlName="exp_level_id"
                    class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                    <option [ngValue]="null">--- Wybierz ---</option>
                    @for (level of experienceLevels(); track level.id) {
                      <option [ngValue]="level.id">{{ level.name }}</option>
                    }
                  </select>
                </div>
              </div>

              <!-- Technologies -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700">Znane Technologie</label>
                <div class="mt-1">
                  <ng-select
                    [items]="technologies()"
                    bindLabel="name"
                    bindValue="id"
                    [multiple]="true"
                    [closeOnSelect]="false"
                    placeholder="Wybierz technologie..."
                    formControlName="technology_ids">
                  </ng-select>
                </div>
              </div>

              <!-- CV Upload instead of Raw Text -->
              <div class="mb-4 mt-6">
                <label class="block text-sm font-medium text-gray-700">Prześlij CV (Analiza technologii)</label>
                <div class="mt-2 flex items-center space-x-4">
                  <input type="file" (change)="onFileSelected($event)" accept=".pdf,.doc,.docx,.txt"
                    class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
                  @if (isAnalyzingCv()) {
                    <div class="flex items-center text-sm text-blue-600">
                      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analizowanie...
                    </div>
                  }
                </div>
                <p class="mt-2 text-sm text-gray-500">Nasz system automatycznie wyodrębni technologie z Twojego pliku CV i zaznaczy je powyżej.</p>
              </div>

            </div>

            <!-- Verification Messages -->
            @if (successMessage()) {
              <div class="rounded-md bg-green-50 p-4 mb-4">
                <div class="text-sm text-green-700">{{ successMessage() }}</div>
              </div>
            }

            @if (errorMessage()) {
              <div class="rounded-md bg-red-50 p-4 mb-4">
                <div class="text-sm text-red-700">{{ errorMessage() }}</div>
              </div>
            }

            <!-- Form Actions -->
            <div class="flex justify-end pt-4 border-t">
              <button type="submit" [disabled]="isSaving()"
                class="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300">
                {{ isSaving() ? 'Zapisywanie...' : 'Zapisz Zmiany' }}
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  private apiService = inject(ApiService);
  private profileService = inject(ProfileApiService);
  private fb = inject(NonNullableFormBuilder);

  // State
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  isAnalyzingCv = signal<boolean>(false);
  successMessage = signal<string>('');
  errorMessage = signal<string>('');

  // Lookups
  experienceLevels = signal<LookupRead[]>([]);
  technologies = signal<LookupRead[]>([]);

  // User Data
  user = signal<UserRead | null>(null);
  profile = signal<UserProfileResponse | null>(null);

  // Form
  profileForm = this.fb.group({
    exp_level_id: this.fb.control<string | null>(null),
    technology_ids: this.fb.control<string[]>([]),
  });

  ngOnInit(): void {
    this.loadLookups();
    this.loadUserData();
  }

  private loadLookups() {
    this.apiService.getLookups('experience-levels').subscribe(res => this.experienceLevels.set(res));
    this.apiService.getLookups('technologies').subscribe(res => this.technologies.set(res));
  }

  private loadUserData() {
    this.isLoading.set(true);

    // Potrzebujemy obu endpointów: /me oraz /me/profile
    this.profileService.getMe().subscribe({
      next: (userData: UserRead) => {
        this.user.set(userData);

        this.profileService.getMyProfile().subscribe({
          next: (profileData: UserProfileResponse) => {
            this.profile.set(profileData);
            this.profileForm.patchValue({
              exp_level_id: profileData.exp_level?.id ?? null,
              technology_ids: profileData.technologies?.map(t => t.id) ?? []
            });
            this.isLoading.set(false);
          },
          error: (err) => {
            if (err.status === 404) {
              // Profil jeszcze nie istnieje - to normalne dla nowego użytkownika
              this.isLoading.set(false);
            } else {
              this.errorMessage.set('Nie udało się załadować szczegółów profilu.');
              this.isLoading.set(false);
            }
          }
        });
      },
      error: () => {
        this.errorMessage.set('Nie udało się załadować profilu użytkownika.');
        this.isLoading.set(false);
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isAnalyzingCv.set(true);
      this.successMessage.set('');
      this.errorMessage.set('');

      this.profileService.analyzeCv(file).subscribe({
        next: (techs: LookupRead[]) => {
          const techIds = techs.map(t => t.id);
          const currentTechIds = this.profileForm.get('technology_ids')?.value || [];
          // Łączymy obecne i nowe technologie, usuwając duplikaty
          const combinedIds = Array.from(new Set([...currentTechIds, ...techIds]));

          this.profileForm.patchValue({ technology_ids: combinedIds });
          this.isAnalyzingCv.set(false);
          this.successMessage.set('CV przeanalizowane pomyślnie! Wykryte technologie zostały zaznaczone.');
          setTimeout(() => this.successMessage.set(''), 5000);
        },
        error: (err) => {
          console.error('Błąd analizy CV:', err);
          this.errorMessage.set('Wystąpił błąd podczas analizy pliku CV.');
          this.isAnalyzingCv.set(false);
        }
      });
    }
  }

  onSubmit() {
    if (this.profileForm.invalid) return;

    this.isSaving.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const formValue = this.profileForm.getRawValue();

    this.profileService.updateMyProfile({
      exp_level_id: formValue.exp_level_id,
      technology_ids: formValue.technology_ids
    }).subscribe({
      next: (res: UserProfileResponse) => {
        this.profile.set(res);
        this.successMessage.set('Profil został pomyślnie zaktualizowany.');
        this.isSaving.set(false);
        // Czyszczenie wiadomości po 3 sekundach
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err: any) => {
        console.error(err);
        this.errorMessage.set('Wystąpił błąd podczas zapisywania profilu.');
        this.isSaving.set(false);
      }
    });
  }
}