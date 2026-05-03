import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { FiltersFormComponent } from '../../app/shared/filters-form/filters-form.component';
import { FiltersInitialState, FiltersValue } from '../../app/shared/filters-form/filters-form.types';
import {
  JobOffersApiService, MappedOffer,
} from '../../app/core/services/job-offers-api.service';

const STORAGE_KEY = 'cv_analizer_candidate_filters';

type JobOffer = MappedOffer;

interface OfferViewModel extends JobOffer {
  matchedTech: string[];
  matchedRoles: string[];
}

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule, RouterModule, FiltersFormComponent],
  templateUrl: './offers.component.html',
  styleUrls: ['./offers.component.css'],
})
export class OffersComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly jobOffersApi = inject(JobOffersApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild(FiltersFormComponent) filtersFormRef?: FiltersFormComponent;

  initialFilters: FiltersInitialState | null = null;
  cvFileName: string | null = null;

  currentFilters: FiltersValue | null = null;
  allOffers: JobOffer[] = [];
  matchedOffers: OfferViewModel[] = [];
  previewOffersCount = 0;

  isLoading = false;
  isLoadingMore = false;
  loadError: string | null = null;

  readonly pageSize = 20;
  currentPage = 0;
  hasMore = true;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.router.events.subscribe(() => {
      this.cdr.markForCheck();
    });

    const navState = history.state as { filters?: FiltersInitialState; cvFileName?: string | null };
    const filters = navState?.filters ?? this.loadSavedFilters();

    if (!filters) {
      this.router.navigate(['/']);
      return;
    }

    this.cvFileName = navState?.cvFileName ?? null;
    this.initialFilters = filters;
  }

  private loadSavedFilters(): FiltersInitialState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  onFiltersReady(value: FiltersValue): void {
    this.currentFilters = value;
    this.resetAndLoad(value);
  }

  onFiltersChange(value: FiltersValue): void {
    this.currentFilters = value;
    this.matchedOffers = this.computeMatchedOffers();
    this.previewOffersCount = this.matchedOffers.length;
  }

  onApplyClicked(value: FiltersValue): void {
    this.currentFilters = value;
    this.resetAndLoad(value);
  }

  loadMore(): void {
    if (!this.currentFilters || !this.hasMore || this.isLoadingMore || this.isLoading) return;
    this.loadOffersFromApi(this.currentFilters, this.currentPage + 1);
  }

  private resetAndLoad(value: FiltersValue): void {
    this.currentPage = 0;
    this.hasMore = true;
    this.allOffers = [];
    this.matchedOffers = [];
    this.previewOffersCount = 0;
    this.loadOffersFromApi(value, 0);
  }

  private loadOffersFromApi(value: FiltersValue, page: number): void {
    const isFirstPage = page === 0;
    if (isFirstPage) {
      this.isLoading = true;
    } else {
      this.isLoadingMore = true;
    }
    this.loadError = null;

    const params: Parameters<typeof this.jobOffersApi.getOffers>[0] = {
      skip: page * this.pageSize,
      limit: this.pageSize,
    };
    if (value.expLevelIds.length > 0) params.exp_level_ids = value.expLevelIds;
    if (value.specializationIds.length > 0) params.specialization_ids = value.specializationIds;
    if (value.technologyIds.length > 0) params.technology_ids = value.technologyIds;
    if (value.siteIds.length > 0) params.site_ids = value.siteIds;
    if (value.locationIds.length > 0) params.location_ids = value.locationIds;
    if (value.workTypeIds.length > 0) params.work_type_ids = value.workTypeIds;
    if (value.salaryFrom > 0) params.salary_from_min = value.salaryFrom;
    if (value.salaryTo < 50000) params.salary_to_max = value.salaryTo;

    this.jobOffersApi.getOffers(params).subscribe({
      next: (apiOffers) => {
        const mapped = apiOffers.map(o => this.jobOffersApi.mapToOffer(o) as JobOffer);
        this.allOffers = isFirstPage ? mapped : [...this.allOffers, ...mapped];
        this.currentPage = page;
        this.hasMore = apiOffers.length >= this.pageSize;
        this.matchedOffers = this.computeMatchedOffers();
        this.previewOffersCount = this.matchedOffers.length;
        this.isLoading = false;
        this.isLoadingMore = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadError = 'Nie udało się załadować ofert. Sprawdź czy backend jest uruchomiony.';
        this.isLoading = false;
        this.isLoadingMore = false;
        this.cdr.markForCheck();
      },
    });
  }

  private computeMatchedOffers(): OfferViewModel[] {
    if (!this.currentFilters) return [];
    const filters = this.currentFilters;
    return this.allOffers
      .filter(offer => this.isSalaryInRange(offer, filters))
      .map(offer => this.toOfferViewModel(offer, filters));
  }

  private isSalaryInRange(offer: JobOffer, filters: FiltersValue): boolean {
    if (offer.salaryMin === 0 && offer.salaryMax === 0) return true;
    return offer.salaryMax >= filters.salaryFrom && offer.salaryMin <= filters.salaryTo;
  }

  private toOfferViewModel(offer: JobOffer, filters: FiltersValue): OfferViewModel {
    const selectedRoles = this.selectedKeys(filters.itArea);
    const selectedTech = this.selectedKeys(filters.technologies);
    const matchedRoles = offer.roles.filter(role => selectedRoles.includes(role));
    const matchedTech = offer.technologies.filter(tech => selectedTech.includes(tech));
    return { ...offer, matchedRoles, matchedTech };
  }

  private selectedKeys(group: Record<string, boolean>): string[] {
    return Object.entries(group).filter(([, v]) => v).map(([k]) => k);
  }

  hasSalary(offer: OfferViewModel): boolean {
    return offer.salaryMin > 0 || offer.salaryMax > 0;
  }

  openOffer(offer: OfferViewModel): void {
    if (offer.url && isPlatformBrowser(this.platformId)) {
      window.open(offer.url, '_blank', 'noopener,noreferrer');
    }
  }

  formatRole(key: string): string {
    return this.filtersFormRef?.formatRole(key) ?? key;
  }

  formatTech(key: string): string {
    return this.filtersFormRef?.formatTech(key) ?? key;
  }

  formatSource(source: string): string {
    return this.filtersFormRef?.availableSites.find(s => s.key === source)?.label ?? source;
  }

  getWorkModeLabel(mode: string): string {
    return mode;
  }

}
