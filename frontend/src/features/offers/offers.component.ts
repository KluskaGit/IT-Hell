import { ChangeDetectorRef, Component, OnInit, OnDestroy, PLATFORM_ID, ViewChild, ElementRef, inject, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, skip } from 'rxjs/operators';

import { FiltersFormComponent } from '../../app/shared/filters-form/filters-form.component';
import { FiltersInitialState, FiltersValue, MAX_SALARY_INDEX, MAX_SALARY } from '../../app/shared/filters-form/filters-form.types';
import { NavbarComponent } from '../../app/shared/navbar/navbar.component';
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
  imports: [CommonModule, FormsModule, RouterModule, FiltersFormComponent, NavbarComponent],
  templateUrl: './offers.component.html',
  styleUrls: ['./offers.component.css'],
})
export class OffersComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly jobOffersApi = inject(JobOffersApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild(FiltersFormComponent) filtersFormRef?: FiltersFormComponent;
  @ViewChild('mainScroll') private mainScrollRef?: ElementRef<HTMLElement>;

  private readonly destroy$ = new Subject<void>();
  private readonly filtersTrigger$ = new Subject<FiltersValue>();
  private readonly searchTrigger$ = new Subject<string>();
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
        {
          root: this.mainScrollRef?.nativeElement ?? null,
          rootMargin: '200px',
          threshold: 0,
        }
      );
      this.intersectionObserver.observe(this.sentinelEl);
    }
  }

  isFiltersVisible = true;

  /* ── Resizable sidebar ── */
  private readonly SIDEBAR_KEY    = 'cv_offers_sidebar_width';
  private readonly SIDEBAR_MIN    = 240;
  private readonly SIDEBAR_MAX    = 480;
  private readonly SIDEBAR_DEFAULT = 340;

  sidebarWidth = this.SIDEBAR_DEFAULT;
  isSidebarDragging = false;

  private dragStartX     = 0;
  private dragStartWidth = 0;
  private readonly boundMove = this.onDragMove.bind(this);
  private readonly boundEnd  = this.onDragEnd.bind(this);

  onDragStart(event: MouseEvent): void {
    event.preventDefault();
    this.isSidebarDragging = true;
    this.dragStartX     = event.clientX;
    this.dragStartWidth = this.sidebarWidth;
    document.addEventListener('mousemove', this.boundMove);
    document.addEventListener('mouseup',   this.boundEnd);
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  private onDragMove(event: MouseEvent): void {
    if (!this.isSidebarDragging) return;
    const delta = event.clientX - this.dragStartX;
    this.sidebarWidth = Math.min(
      this.SIDEBAR_MAX,
      Math.max(this.SIDEBAR_MIN, this.dragStartWidth + delta)
    );
    this.cdr.markForCheck();
  }

  private onDragEnd(): void {
    this.isSidebarDragging = false;
    document.removeEventListener('mousemove', this.boundMove);
    document.removeEventListener('mouseup',   this.boundEnd);
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.SIDEBAR_KEY, String(this.sidebarWidth));
    }
  }

  private loadSidebarWidth(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const raw = localStorage.getItem(this.SIDEBAR_KEY);
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed)) {
        this.sidebarWidth = Math.min(this.SIDEBAR_MAX, Math.max(this.SIDEBAR_MIN, parsed));
      }
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
    this.loadSidebarWidth();

    this.router.events.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.cdr.markForCheck();
    });

    this.filtersTrigger$.pipe(
      skip(1),
      debounceTime(700),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.updateUrl(value);
      this.resetAndLoad(value);
    });

    this.searchTrigger$.pipe(
      debounceTime(500),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.currentFilters) this.resetAndLoad(this.currentFilters);
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
      salFrom:   value.salaryFromIndex > 0                ? String(value.salaryFromIndex) : null,
      salTo:     value.salaryToIndex < MAX_SALARY_INDEX   ? String(value.salaryToIndex)   : null,
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
    this.matchedOffers = this.computeMatchedOffers();
    this.filtersTrigger$.next(value);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.intersectionObserver?.disconnect();
    document.removeEventListener('mousemove', this.boundMove);
    document.removeEventListener('mouseup',   this.boundEnd);
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
    if (value.salaryTo < MAX_SALARY) params.salary_to_max = value.salaryTo;
    const q = this.searchQuery.trim();
    if (q) params.title = q;

    this.jobOffersApi.getOffers(params).subscribe({
      next: (apiOffers) => {
        const mapped = apiOffers.map(o => this.jobOffersApi.mapToOffer(o) as JobOffer);
        this.allOffers = isFirstPage ? mapped : [...this.allOffers, ...mapped];
        this.currentPage = page;
        this.hasMore = apiOffers.length === this.pageSize;
        this.matchedOffers = this.computeMatchedOffers();
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

  get displayedOffers(): OfferViewModel[] {
    return this.matchedOffers;
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.searchTrigger$.next(query);
  }

  onSearchClear(): void {
    this.searchQuery = '';
    this.searchTrigger$.next('');
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
    return this.filtersFormRef?.availableWorkTypes.find(w => w.id === mode)?.label ?? mode;
  }

}
