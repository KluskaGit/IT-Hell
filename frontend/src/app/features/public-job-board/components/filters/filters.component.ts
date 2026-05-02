import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { JobBoardService } from '../../services/job-board.service';
import { LookupRead } from '../../models/lookup.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { ProfileApiService } from '../../../../core/services/profile-api.service';

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5 sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
      <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
        Filtruj oferty
      </h3>
      
      <form [formGroup]="filterForm" class="space-y-5">
        
        <!-- Stanowisko -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Stanowisko</label>
          <input type="text" formControlName="title" placeholder="np. Python Developer" 
                 class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
        </div>

        <!-- Wynagrodzenie -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Wynagrodzenie (PLN)</label>
          <div class="flex gap-2 items-center">
            <input type="number" formControlName="salary_from_min" placeholder="Od" min="0" step="500"
                   class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <span class="text-gray-400">-</span>
            <input type="number" formControlName="salary_to_max" placeholder="Do" min="0" step="500"
                   class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
          </div>
        </div>

        <!-- Technologie -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Technologie</label>
          <ng-select [items]="technologies" bindLabel="name" bindValue="id" [multiple]="true" formControlName="technology_ids" placeholder="Wybierz technologie"></ng-select>
        </div>

        <!-- Lokalizacje -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Lokalizacja</label>
          <ng-select [items]="locations" bindLabel="name" bindValue="id" [multiple]="true" formControlName="location_ids" placeholder="Wybierz miasta"></ng-select>
        </div>

        <!-- Poziom doświadczenia -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Doświadczenie</label>
          <ng-select [items]="expLevels" bindLabel="name" bindValue="id" [multiple]="true" formControlName="exp_level_ids" placeholder="Wybierz poziom"></ng-select>
        </div>

        <!-- Specjalizacje -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Specjalizacja</label>
          <ng-select [items]="specializations" bindLabel="name" bindValue="id" [multiple]="true" formControlName="specialization_ids" placeholder="Wybierz specjalizację"></ng-select>
        </div>

        <!-- Zródła (Sites) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Źródła</label>
          <ng-select [items]="sites" bindLabel="name" bindValue="id" [multiple]="true" formControlName="site_ids" placeholder="Wybierz portale"></ng-select>
        </div>

        <!-- Tryb pracy -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tryb pracy</label>
          <ng-select [items]="workTypes" bindLabel="name" bindValue="id" [multiple]="true" formControlName="work_type_ids" placeholder="Wybierz tryb"></ng-select>
        </div>

        <button type="button" (click)="resetFilters()" class="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors text-sm">
          Zresetuj filtry
        </button>

        @if (authService.hasValidToken()) {
          <button type="button" (click)="fillFromProfile()" [disabled]="isProfileLoading" class="w-full mt-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-md transition-colors text-sm flex justify-center items-center gap-2 disabled:opacity-50">
            @if (isProfileLoading) {
              <svg class="animate-spin h-4 w-4 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            }
            Dopasuj do mojego profilu
          </button>
        }

      </form>
    </div>
  `
})
export class FiltersComponent implements OnInit, OnDestroy {
  filterForm: FormGroup;
  
  technologies: LookupRead[] = [];
  locations: LookupRead[] = [];
  expLevels: LookupRead[] = [];
  workTypes: LookupRead[] = [];
  specializations: LookupRead[] = [];
  sites: LookupRead[] = [];
  
  private destroy$ = new Subject<void>();
  private apiService = inject(ApiService);
  private jobBoardService = inject(JobBoardService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  authService = inject(AuthService);
  private profileService = inject(ProfileApiService);
  
  isProfileLoading = false;

  constructor(private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      title: [''],
      salary_from_min: [null],
      salary_to_max: [null],
      technology_ids: [[]],
      location_ids: [[]],
      exp_level_ids: [[]],
      work_type_ids: [[]],
      specialization_ids: [[]],
      site_ids: [[]]
    });
  }

  ngOnInit() {
    this.loadDropdownData();

    // 1. Inicjalizacja formularza na podstawie URL (Source of Truth)
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const parsedValues = {
          title: params['title'] || '',
          salary_from_min: params['salary_from_min'] ? Number(params['salary_from_min']) : null,
          salary_to_max: params['salary_to_max'] ? Number(params['salary_to_max']) : null,
          technology_ids: this.parseArrayParam(params['technology_ids']),
          location_ids: this.parseArrayParam(params['location_ids']),
          exp_level_ids: this.parseArrayParam(params['exp_level_ids']),
          work_type_ids: this.parseArrayParam(params['work_type_ids']),
          specialization_ids: this.parseArrayParam(params['specialization_ids']),
          site_ids: this.parseArrayParam(params['site_ids'])
        };

        // Zaktualizuj formularz BEZ wywoływania eventów zmiany (emitEvent: false), aby uniknąć pętli
        this.filterForm.patchValue(parsedValues, { emitEvent: false });
        
        // Zaktualizuj i pobierz oferty z serwisu
        this.jobBoardService.updateFilters(parsedValues);
      });

    // 2. Reaguj na zmiany formularza z opóźnieniem i aktualizuj URL
    this.filterForm.valueChanges
      .pipe(
        debounceTime(400),
        takeUntil(this.destroy$)
      )
      .subscribe(values => {
        const queryParams: any = {};
        
        Object.keys(values).forEach(key => {
          const val = values[key];
          if (val !== null && val !== undefined && val !== '') {
            if (Array.isArray(val)) {
              if (val.length > 0) {
                queryParams[key] = val;
              }
            } else {
              queryParams[key] = val;
            }
          }
        });

        // Wypchnij zmiany do paska URL, co automatycznie odświeży subskrypcję queryParams powyżej
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: queryParams,
          replaceUrl: true // Zapobiega tworzeniu setek wpisów w historii podczas pisania
        });
      });
  }

  private loadDropdownData() {
    this.apiService.getLookups('technologies').subscribe((res: LookupRead[]) => this.technologies = res);
    this.apiService.getLookups('locations').subscribe((res: LookupRead[]) => this.locations = res);
    this.apiService.getLookups('experience-levels').subscribe((res: LookupRead[]) => this.expLevels = res);
    this.apiService.getLookups('work-types').subscribe((res: LookupRead[]) => this.workTypes = res);
    this.apiService.getLookups('specializations').subscribe((res: LookupRead[]) => this.specializations = res);
    this.apiService.getLookups('sites').subscribe((res: LookupRead[]) => this.sites = res);
  }

  resetFilters() {
    this.filterForm.reset({
      title: '',
      technology_ids: [],
      location_ids: [],
      exp_level_ids: [],
      work_type_ids: [],
      specialization_ids: [],
      site_ids: []
    });
  }

  fillFromProfile() {
    this.isProfileLoading = true;
    this.profileService.getMyProfile().subscribe({
      next: (profile) => {
        const expIds = profile.exp_level ? [profile.exp_level.id] : [];
        const techIds = profile.technologies ? profile.technologies.map(t => t.id) : [];
        
        this.filterForm.patchValue({
          exp_level_ids: expIds,
          technology_ids: techIds
        });
        this.isProfileLoading = false;
      },
      error: (err) => {
        this.isProfileLoading = false;
        if (err.status !== 404) {
          console.error('Błąd pobierania profilu', err);
        }
      }
    });
  }

  private parseArrayParam(param: string | string[] | undefined): string[] {
    if (!param) return [];
    if (Array.isArray(param)) return param;
    return [param];
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
