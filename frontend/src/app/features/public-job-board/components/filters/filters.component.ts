import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { JobBoardService } from '../../services/job-board.service';
import { LookupRead } from '../../models/lookup.model';

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5 sticky top-6">
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

    // Reaguj na zmiany formularza z opóźnieniem, żeby nie spamować backendu co każdą literkę
    this.filterForm.valueChanges
      .pipe(
        debounceTime(400),
        takeUntil(this.destroy$)
      )
      .subscribe(values => {
        this.jobBoardService.updateFilters(values);
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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
