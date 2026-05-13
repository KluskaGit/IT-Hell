import { ChangeDetectorRef, Component, OnInit, OnDestroy, PLATFORM_ID, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { FiltersFormComponent } from '../../app/shared/filters-form/filters-form.component';
import { FiltersInitialState, FiltersValue } from '../../app/shared/filters-form/filters-form.types';
import {
  JobOffersApiService, MappedOffer,
} from '../../app/core/services/job-offers-api.service';
import { AuthService } from '../auth/auth.service';

const STORAGE_KEY = 'cv_analizer_candidate_filters';

type JobOffer = MappedOffer;

interface OfferViewModel extends JobOffer {
  matchedTech: string[];
  matchedRoles: string[];
}

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FiltersFormComponent],
  templateUrl: './offers.component.html',
  styleUrls: ['./offers.component.css'],
})
export class OffersComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly jobOffersApi = inject(JobOffersApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly authService = inject(AuthService);

  @ViewChild(FiltersFormComponent) filtersFormRef?: FiltersFormComponent;

  private readonly destroy$ = new Subject<void>();
  private intersectionObserver?: IntersectionObserver;
  private sentinelEl?: HTMLElement;
  private isSentinelVisible = false;

  @ViewChild('scrollSentinel')
  set scrollSentinel(el: ElementRef | undefined) {
    if (el?.nativeElement === this.sentinelEl) return;
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = undefined;
    this.sentinelEl = el?.nativeElement;
    if (this.sentinelEl && isPlatformBrowser(this.platformId)) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          this.isSentinelVisible = entries[0].isIntersecting;
          if (entries[0].isIntersecting) this.loadMore();
        },
        { rootMargin: '200px' }
      );
      this.intersectionObserver.observe(this.sentinelEl);
    }
  }

  initialFilters: FiltersInitialState | null = null;
  cvFileName: string | null = null;

  currentFilters: FiltersValue | null = null;
  allOffers: JobOffer[] = [];
  matchedOffers: OfferViewModel[] = [];

  searchQuery = '';
  searchFocused = false;

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

    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (this.initialFilters) return;

        const urlFilters = this.urlToFilters(params);
        if (urlFilters) {
          this.initialFilters = urlFilters;
          return;
        }

        const navState = history.state as { filters?: FiltersInitialState; cvFileName?: string | null };
        const stateFilters = navState?.filters;
        const filters = stateFilters ?? this.loadSavedFilters();

        if (!filters) {
          this.router.navigate(['/']);
          return;
        }

        this.cvFileName = navState?.cvFileName ?? null;
        this.initialFilters = filters;
      });
  }

  private updateUrl(value: FiltersValue): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.buildQueryParams(value),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private buildQueryParams(value: FiltersValue): Record<string, string[] | string | null> {
    return {
      roles:     value.specializationIds.length ? value.specializationIds : null,
      seniority: value.expLevelIds.length       ? value.expLevelIds       : null,
      wm:        value.workTypeIds.length        ? value.workTypeIds        : null,
      sites:     value.siteIds.length            ? value.siteIds            : null,
      loc:       value.locationIds.length        ? value.locationIds        : null,
      tech:      value.technologyIds.length      ? value.technologyIds      : null,
      salFrom:   value.salaryFromIndex > 0       ? String(value.salaryFromIndex) : null,
      salTo:     value.salaryToIndex < 25        ? String(value.salaryToIndex)   : null,
    };
  }

  private urlToFilters(params: ParamMap): FiltersInitialState | null {
    const knownKeys = ['roles', 'seniority', 'wm', 'sites', 'loc', 'tech', 'salFrom', 'salTo'];
    if (!knownKeys.some(k => params.has(k))) return null;

    // getAll handles ?key=v1&key=v2 (array format); flatMap+split handles legacy ?key=v1,v2 format
    const getIds = (key: string): string[] =>
      params.getAll(key).flatMap(v => v.split(',').filter(Boolean));

    const result: FiltersInitialState = {};

    const roles = getIds('roles');
    if (roles.length) result.itArea = Object.fromEntries(roles.map(id => [id, true]));

    const seniority = getIds('seniority');
    if (seniority.length) result.seniority = Object.fromEntries(seniority.map(id => [id, true]));

    const wm = getIds('wm');
    if (wm.length) result.workModeIds = wm;

    const sites = getIds('sites');
    if (sites.length) result.jobSiteKeys = sites;

    const loc = getIds('loc');
    if (loc.length) result.locationIds = loc;

    const tech = getIds('tech');
    if (tech.length) result.technologies = Object.fromEntries(tech.map(id => [id, true]));

    const salFrom = params.get('salFrom');
    if (salFrom != null) result.salaryFromIndex = +salFrom;
    const salTo = params.get('salTo');
    if (salTo != null) result.salaryToIndex = +salTo;

    return result;
  }

  private loadSavedFilters(): FiltersInitialState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  onFiltersReady(value: FiltersValue): void {
    this.currentFilters = value;
    this.updateUrl(value);
    this.resetAndLoad(value);
  }

  onFiltersChange(value: FiltersValue): void {
    this.currentFilters = value;
    this.updateUrl(value);
    this.matchedOffers = this.computeMatchedOffers();
  }

  onApplyClicked(value: FiltersValue): void {
    this.currentFilters = value;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.buildQueryParams(value),
      queryParamsHandling: 'merge',
    });
    this.resetAndLoad(value);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.intersectionObserver?.disconnect();
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
        this.isLoading = false;
        this.isLoadingMore = false;
        this.cdr.markForCheck();
        if (this.hasMore && this.isSentinelVisible) {
          setTimeout(() => this.loadMore(), 0);
        }
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

  get displayedOffers(): OfferViewModel[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.matchedOffers;
    return this.matchedOffers.filter(o =>
      o.title.toLowerCase().includes(q) ||
      o.company.toLowerCase().includes(q) ||
      o.location.toLowerCase().includes(q)
    );
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

  get isAuthenticated() { return this.authService.isAuthenticated; }
  get username() { return this.authService.username; }

  async logout(): Promise<void> { await this.authService.logout(); }
  async login(): Promise<void> { await this.authService.login(); }
}
