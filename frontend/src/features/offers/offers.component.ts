// /offers page component - job offer list with filters, search and infinite scroll.
// Offer data is fetched from the backend via JobOffersApiService (core/services/job-offers-api.service.ts).
// Filters are handled by FiltersFormComponent (shared/filters-form/filters-form.component.ts).
// The FiltersValue and FiltersInitialState types are defined in shared/filters-form/filters-form.types.ts.
import { ChangeDetectorRef, Component, OnInit, OnDestroy, PLATFORM_ID, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, skip } from 'rxjs/operators';

import { FiltersFormComponent, MAX_SALARY_INDEX } from '../../app/shared/filters-form/filters-form.component';
import { FiltersInitialState, FiltersValue, FILTERS_STORAGE_KEY } from '../../app/shared/filters-form/filters-form.types';
import { NavbarComponent } from '../../app/shared/navbar/navbar.component';
import {
  JobOffersApiService, MappedOffer,
} from '../../app/core/services/job-offers-api.service';
import { AuthService } from '../auth/auth.service';
import { UserApiService } from '../../app/core/services/user-api.service';

// Upper bound of the salary slider in PLN (must match the value in filters-form.component.ts)
const MAX_SALARY = 50000;

// OfferViewModel extends MappedOffer (from job-offers-api.service.ts) with two extra fields
// computed locally - matchedTech and matchedRoles are only needed in the offers list view
// to show the "matched technologies / roles" badges on offer cards
interface OfferViewModel extends MappedOffer {
  matchedTech: string[];  // technology keys from the offer that the user selected in the filters
  matchedRoles: string[]; // role keys from the offer that the user selected in the filters
}

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FiltersFormComponent, NavbarComponent],
  templateUrl: './offers.component.html',
  styleUrls: ['./offers.component.css'],
})
export class OffersComponent implements OnInit, OnDestroy {
  // Router and ActivatedRoute - for reading URL params and navigating without a full page reload
  private readonly router      = inject(Router);
  private readonly route       = inject(ActivatedRoute);
  // PLATFORM_ID - lets us check whether the code runs in the browser or during SSR (server-side rendering)
  // Many things (localStorage, IntersectionObserver, window) only exist in the browser
  private readonly platformId  = inject(PLATFORM_ID);
  // JobOffersApiService - fetches offers from the backend GET /v1/job-offers/get_offer_filter
  private readonly jobOffersApi = inject(JobOffersApiService);
  // ChangeDetectorRef - manual view refresh (the component uses OnPush)
  private readonly cdr         = inject(ChangeDetectorRef);
  // AuthService - checks whether the user is logged in via Keycloak
  private readonly authService = inject(AuthService);
  // UserApiService - fetches the logged-in user's profile from GET /v1/users/me/profile
  private readonly userApi     = inject(UserApiService);

  // filtersFormRef - reference to the FiltersFormComponent in the template
  // Used to call computeValue() and patchValue() on the filter form
  @ViewChild(FiltersFormComponent) filtersFormRef?: FiltersFormComponent;
  // mainScrollRef - reference to the main scroll container in the template (#mainScroll)
  // Passed to IntersectionObserver as the root (the observed area)
  @ViewChild('mainScroll') private mainScrollRef?: ElementRef<HTMLElement>;

  // destroy$ - Subject used to cancel all RxJS subscriptions when the component is destroyed.
  // Every subscription has .pipe(takeUntil(this.destroy$)) - when destroy$.next() is called,
  // all subscriptions complete automatically and there are no memory leaks
  private readonly destroy$        = new Subject<void>();
  // filtersTrigger$ - emits new filters whenever the user changes anything in the form.
  // Debounced by 700ms - we don't send an API request on every checkbox click
  private readonly filtersTrigger$ = new Subject<FiltersValue>();
  // searchTrigger$ - a separate Subject only for the offer title search field.
  // Shorter debounce (500ms) than filtersTrigger$ because search should react faster
  private readonly searchTrigger$  = new Subject<string>();
  // intersectionObserver - watches the sentinel element at the end of the list and calls loadMore()
  // when the sentinel enters the viewport (i.e. infinite scroll)
  private intersectionObserver?: IntersectionObserver;
  // sentinelEl - reference to the currently observed sentinel element (a div at the end of the list)
  private sentinelEl?: HTMLElement;

  // scrollSentinel uses a setter instead of @ViewChild() with ngAfterViewInit, because the
  // #scrollSentinel element appears and disappears dynamically in the template (e.g. it disappears
  // while offers are loading or when the list is empty).
  // Angular calls the setter every time the element appears in or leaves the DOM,
  // so IntersectionObserver is always bound to the current element.
  @ViewChild('scrollSentinel')
  set scrollSentinel(el: ElementRef | undefined) {
    // If the element has not changed, do nothing (guard against needless rebinding)
    if (el?.nativeElement === this.sentinelEl) return;
    // Disconnect the previous observer before binding a new one
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = undefined;
    this.sentinelEl = el?.nativeElement;
    if (this.sentinelEl && isPlatformBrowser(this.platformId)) {
      // IntersectionObserver detects when the sentinel element (an invisible div at the bottom of
      // the list) enters the visible area - then it calls loadMore() and loads the next page of offers
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) this.loadMore();
        },
        {
          root: this.mainScrollRef?.nativeElement ?? null, // observed area = the list container
          rootMargin: '200px', // load the next page 200px before the user reaches the end
          threshold: 0,        // react when at least 1 pixel of the sentinel is visible
        }
      );
      this.intersectionObserver.observe(this.sentinelEl);
    }
  }

  // Filter panel visibility flag - toggled by a button in the template (shows/hides the sidebar)
  isFiltersVisible = true;

  // Keys and dimensions of the filter sidebar (the panel to the left of the offer list).
  // The sidebar width can be changed by dragging the handle between the sidebar and the offer list.
  // SIDEBAR_KEY - the localStorage key where we remember the last width
  private readonly SIDEBAR_KEY     = 'cv_offers_sidebar_width';
  // Minimum and maximum sidebar width in pixels - clamps the dragging
  private readonly SIDEBAR_MIN     = 240;
  private readonly SIDEBAR_MAX     = 480;
  // Default sidebar width used on the first visit (before the user changes it)
  private readonly SIDEBAR_DEFAULT = 340;

  // Current sidebar width in pixels - bound to [style.width] in the template
  sidebarWidth      = this.SIDEBAR_DEFAULT;
  // Flag indicating whether the user is currently dragging the sidebar handle
  // (used in the template to add a CSS class while dragging)
  isSidebarDragging = false;

  // Cursor X position and sidebar width at the moment the drag handle is clicked -
  // needed to compute how much to change the width while moving the mouse
  private dragStartX     = 0;
  private dragStartWidth = 0;
  // bind() creates stable references to onDragMove and onDragEnd bound to this class instance.
  // This is required because addEventListener and removeEventListener must receive the
  // identical function reference - without bind() each .bind() call would create a new reference
  // and removeEventListener could not find the right listener to remove
  private readonly boundMove = this.onDragMove.bind(this);
  private readonly boundEnd  = this.onDragEnd.bind(this);

  onDragStart(event: MouseEvent): void {
    event.preventDefault(); // prevents the default text selection while dragging
    this.isSidebarDragging = true;
    this.dragStartX     = event.clientX;
    this.dragStartWidth = this.sidebarWidth;
    // Listeners are added on document (not on the element) so the drag works even when the cursor
    // leaves the handle area or goes outside the browser window during a fast move
    document.addEventListener('mousemove', this.boundMove);
    document.addEventListener('mouseup',   this.boundEnd);
    document.body.style.cursor     = 'col-resize'; // change the cursor globally while dragging
    document.body.style.userSelect = 'none';       // block text selection on the page
  }

  private onDragMove(event: MouseEvent): void {
    if (!this.isSidebarDragging) return;
    // delta - how many pixels the cursor moved since the handle was clicked
    const delta = event.clientX - this.dragStartX;
    // New width = start width + delta, clamped to the MIN-MAX range
    this.sidebarWidth = Math.min(
      this.SIDEBAR_MAX,
      Math.max(this.SIDEBAR_MIN, this.dragStartWidth + delta)
    );
    this.cdr.markForCheck(); // force a view refresh because the sidebar is updated via CSS
  }

  private onDragEnd(): void {
    this.isSidebarDragging = false;
    // Remove the listeners from document - they must be the same references as in addEventListener,
    // hence we use boundMove and boundEnd instead of new .bind() calls
    document.removeEventListener('mousemove', this.boundMove);
    document.removeEventListener('mouseup',   this.boundEnd);
    document.body.style.cursor     = ''; // restore the default cursor
    document.body.style.userSelect = ''; // restore text selection
    // Remember the new width in localStorage - it will be loaded on the next visit to /offers
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.SIDEBAR_KEY, String(this.sidebarWidth));
    }
  }

  // Loads the saved sidebar width from localStorage.
  // Called once in ngOnInit - restores the width last set by the user.
  private loadSidebarWidth(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const raw = localStorage.getItem(this.SIDEBAR_KEY);
    if (raw) {
      const parsed = parseInt(raw, 10);
      // Clamp to MIN-MAX in case the constants changed since the previous visit
      if (!isNaN(parsed)) {
        this.sidebarWidth = Math.min(this.SIDEBAR_MAX, Math.max(this.SIDEBAR_MIN, parsed));
      }
    }
  }

  // initialFilters - the form state passed to FiltersFormComponent on the first render.
  // Type FiltersInitialState (from filters-form.types.ts) - a partial object with optional fields,
  // because we don't always have all filters saved (e.g. first visit = empty object {})
  initialFilters: FiltersInitialState | null = null;
  // currentFilters - the current full form state after every change by the user.
  // Type FiltersValue (from filters-form.types.ts) - a complete object with all fields,
  // ready to be sent as API params
  currentFilters: FiltersValue | null = null;
  // allOffers - all offers fetched from the backend, accumulated across pages (infinite scroll).
  // Raw API data after mapping with jobOffersApi.mapToOffer() to the MappedOffer interface
  allOffers: MappedOffer[] = [];
  // matchedOffers - client-side filtered offers enriched with matchedTech and matchedRoles.
  // This is the array rendered in the template via *ngFor
  matchedOffers: OfferViewModel[] = [];

  // searchQuery - the current text typed in the search field (filtering by offer title)
  searchQuery  = '';
  // searchFocused - whether the search field is active (used in the template for styling)
  searchFocused = false;

  // isLoading - true while loading the first page of offers (shows the main spinner/skeleton)
  isLoading     = false;
  // isLoadingMore - true while loading subsequent pages (shows a small spinner at the bottom of the list)
  isLoadingMore = false;
  // loadError - error message when the API request failed (null when there is no error)
  loadError: string | null = null;

  // pageSize - number of offers fetched in a single API request (the skip/limit params)
  readonly pageSize = 20;
  // currentPage - the index of the currently loaded page (0 = first)
  currentPage = 0;
  // hasMore - false when the last API response returned fewer records than pageSize,
  // which means there are no more pages to load
  hasMore     = true;

  // Getter exposing the login state from AuthService (Keycloak) to the template
  get isAuthenticated() { return this.authService.isAuthenticated; }

  ngOnInit(): void {
    // The whole component needs the browser (localStorage, IntersectionObserver, history.state)
    // During SSR (server-side rendering) the component does not initialize
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadSidebarWidth();

    // Router events subscription - forces a view refresh on every navigation.
    // Needed because e.g. the navbar checks auth.isAuthenticated and must know about state changes
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.cdr.markForCheck();
    });

    // filtersTrigger$ handles filter changes with a delay (700ms debounce).
    // skip(1) skips the first emission - the first offer load is triggered by onFiltersReady(),
    // not this subscription. Without skip(1) the page would double-load on startup.
    this.filtersTrigger$.pipe(
      skip(1),
      debounceTime(700),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.updateUrl(value);    // update the URL so the link with filters can be copied
      this.resetAndLoad(value); // reload offers from scratch with the new filters
    });

    // searchTrigger$ handles typing in the search field with a 500ms debounce.
    // A different Subject than filters - different delay and it doesn't update the URL on every keystroke
    this.searchTrigger$.pipe(
      debounceTime(500),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.currentFilters) this.resetAndLoad(this.currentFilters);
    });

    // queryParamMap subscription - reads filters from the URL when entering the page.
    // Filter source priority (highest first):
    //   1. URL params (?roles=...&tech=...) - when the user arrives via a shared link
    //   2. history.state.filters - when the user navigates from home via router.navigate()
    //   3. localStorage (key FILTERS_STORAGE_KEY) - the last filters saved from home or offers
    //   4. Empty object {} - first visit, no saved data
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        // We set initialFilters only once - ignore later emissions (e.g. after updateUrl)
        if (this.initialFilters) return;

        const urlFilters = this.urlToFilters(params);
        if (urlFilters) {
          this.initialFilters = urlFilters;
          return;
        }

        // history.state.filters - passed by home.component.ts via router.navigate(['/offers'], { state: { filters } })
        const navState = history.state as { filters?: FiltersInitialState };
        const stateFilters = navState?.filters;
        const filters = stateFilters ?? this.loadSavedFilters() ?? {};

        this.initialFilters = filters;
      });
  }

  // Updates the URL params without reloading the page and without adding a new history entry.
  // This lets the user copy the URL and share a link with the current filters.
  // replaceUrl: true - replaces the current browser history entry instead of adding a new one
  private updateUrl(value: FiltersValue): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.buildQueryParams(value),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  // Builds the URL params object from the current filters.
  // Uses short keys (roles, wm, loc instead of full names) to keep the URL short.
  // null means "remove this param from the URL" when the filter is not active.
  // salFrom and salTo are slider indexes (not PLN amounts) - same as FiltersValue from filters-form.types.ts
  private buildQueryParams(value: FiltersValue): Record<string, string[] | string | null> {
    return {
      roles:     value.specializationIds.length ? value.specializationIds : null,
      seniority: value.expLevelIds.length       ? value.expLevelIds       : null,
      wm:        value.workTypeIds.length        ? value.workTypeIds        : null,  // wm = work mode
      sites:     value.siteIds.length            ? value.siteIds            : null,
      loc:       value.locationIds.length        ? value.locationIds        : null,
      tech:      value.technologyIds.length      ? value.technologyIds      : null,
      salFrom:   value.salaryFromIndex > 0              ? String(value.salaryFromIndex) : null,
      salTo:     value.salaryToIndex < MAX_SALARY_INDEX ? String(value.salaryToIndex)   : null,
    };
  }

  // Parses URL params back into FiltersInitialState (type from filters-form.types.ts).
  // This is the inverse of buildQueryParams - we read the URL and reconstruct the filter state.
  // Returns null when the URL contains none of the known filter keys (e.g. direct visit to /offers)
  private urlToFilters(params: ParamMap): FiltersInitialState | null {
    const knownKeys = ['roles', 'seniority', 'wm', 'sites', 'loc', 'tech', 'salFrom', 'salTo'];
    if (!knownKeys.some(k => params.has(k))) return null;

    // getIds handles both ?tech=a&tech=b (multiple params with the same name)
    // and ?tech=a,b (comma-separated values) - for compatibility with different URL formats
    const getIds = (key: string): string[] =>
      params.getAll(key).flatMap(v => v.split(',').filter(Boolean));

    const result: FiltersInitialState = {};

    // The itArea and seniority fields in FiltersInitialState are objects { id: true }, not arrays,
    // so we convert the ID array into an object via Object.fromEntries
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

    // salFrom and salTo are salary slider indexes (not PLN amounts) - FiltersForm converts them to PLN
    const salFrom = params.get('salFrom');
    if (salFrom != null) result.salaryFromIndex = +salFrom;
    const salTo = params.get('salTo');
    if (salTo != null) result.salaryToIndex = +salTo;

    return result;
  }

  // Reads the last saved filters from localStorage.
  // The FILTERS_STORAGE_KEY key is shared with home.component.ts and profile.component.ts -
  // so filters set on the home page are available on the offers page and vice versa
  private loadSavedFilters(): FiltersInitialState | null {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  // onFiltersReady - called ONCE by FiltersFormComponent via (ready) in the template,
  // when the filter form finishes initializing and is ready to work.
  // This event triggers the first offer load from the backend
  onFiltersReady(value: FiltersValue): void {
    this.currentFilters = value;
    this.updateUrl(value);    // set the URL to match the initial filters
    this.resetAndLoad(value); // load the first offers
  }

  // onFiltersChange - called by FiltersFormComponent via (filtersChange) in the template
  // on EVERY filter change by the user (checkbox click, slider change, etc.).
  // It immediately recomputes matchedOffers (client-side filtering, no API request),
  // and sends the API request only after a 700ms debounce via filtersTrigger$
  onFiltersChange(value: FiltersValue): void {
    this.currentFilters = value;
    this.matchedOffers  = this.computeMatchedOffers(); // immediate recompute in the browser
    this.filtersTrigger$.next(value);                  // delayed API request (700ms debounce)
  }

  ngOnDestroy(): void {
    // Cancel all RxJS subscriptions - destroy$.next() completes takeUntil in every pipe
    this.destroy$.next();
    this.destroy$.complete();
    // Disconnect IntersectionObserver - without this it observes elements that no longer exist (memory leak)
    this.intersectionObserver?.disconnect();
    // Remove the global document listeners - needed when the user navigates during a sidebar drag
    document.removeEventListener('mousemove', this.boundMove);
    document.removeEventListener('mouseup',   this.boundEnd);
  }

  // Loads the next page of offers from the backend.
  // Called automatically by IntersectionObserver when the sentinel enters the viewport,
  // or manually by the "Load more" button in the template (a fallback when the observer is not working)
  loadMore(): void {
    if (!this.currentFilters || !this.hasMore || this.isLoadingMore || this.isLoading) return;
    this.loadOffersFromApi(this.currentFilters, this.currentPage + 1);
  }

  // Resets pagination to page 0 and clears the offer list, then loads from scratch.
  // Called when filters or search change - new criteria = a new list from the beginning
  private resetAndLoad(value: FiltersValue): void {
    this.currentPage  = 0;
    this.hasMore      = true;
    this.allOffers    = [];
    this.matchedOffers = [];
    this.loadOffersFromApi(value, 0);
  }

  // Performs a request to the backend GET /v1/job-offers/get_offer_filter with the current filters and page.
  // Handles two loading modes: the first page (isLoading) and subsequent pages (isLoadingMore)
  private loadOffersFromApi(value: FiltersValue, page: number): void {
    const isFirstPage = page === 0;
    // The first load shows the main spinner (covers the whole list),
    // subsequent pages show only a small spinner at the bottom (the list stays visible)
    if (isFirstPage) {
      this.isLoading = true;
    } else {
      this.isLoadingMore = true;
    }
    this.loadError = null;

    // Build the request params - skip/limit for pagination, the rest are the user's filters.
    // The Parameters<...>[0] type automatically picks up the type of the first argument of getOffers()
    const params: Parameters<typeof this.jobOffersApi.getOffers>[0] = {
      skip:  page * this.pageSize, // how many records to skip (e.g. page 2 = skip 20)
      limit: this.pageSize,        // how many records to fetch (always 20)
    };
    // Send a filter param only when it is active - skip empty arrays or default values.
    // The backend ignores missing params (treats them as "no filter")
    if (value.expLevelIds.length > 0)      params.exp_level_ids     = value.expLevelIds;
    if (value.specializationIds.length > 0) params.specialization_ids = value.specializationIds;
    if (value.technologyIds.length > 0)     params.technology_ids    = value.technologyIds;
    if (value.siteIds.length > 0)           params.site_ids          = value.siteIds;
    if (value.locationIds.length > 0)       params.location_ids      = value.locationIds;
    if (value.workTypeIds.length > 0)       params.work_type_ids     = value.workTypeIds;
    if (value.salaryFrom > 0)               params.salary_from_min   = value.salaryFrom;
    if (value.salaryTo < MAX_SALARY)        params.salary_to_max     = value.salaryTo;
    // Offer title search - sent only when the user typed something
    const q = this.searchQuery.trim();
    if (q) params.title = q;

    this.jobOffersApi.getOffers(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (apiOffers) => {
        // Convert the raw API response into MappedOffer via jobOffersApi.mapToOffer()
        // (the mapping handles null values and the 'None' string returned by Python/FastAPI)
        const mapped = apiOffers.map(o => this.jobOffersApi.mapToOffer(o) as MappedOffer);
        const sorted = this.sortBatch(mapped);
        // The first page replaces the whole list, subsequent pages are appended at the end
        this.allOffers    = isFirstPage ? sorted : [...this.allOffers, ...sorted];
        this.currentPage  = page;
        // When the API returned fewer records than pageSize, this was the last page - no more pages
        this.hasMore      = apiOffers.length === this.pageSize;
        this.matchedOffers = this.computeMatchedOffers();
        this.isLoading     = false;
        this.isLoadingMore = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        // status 0 means no connection to the server (CORS error or the backend is down)
        this.loadError = err.status === 0
          ? 'Brak połączenia z serwerem. Sprawdź czy backend jest uruchomiony.'
          : `Nie udało się załadować ofert (błąd ${err.status}).`;
        this.isLoading     = false;
        this.isLoadingMore = false;
        this.cdr.markForCheck();
      },
    });
  }

  // Sorts a batch of offers before adding it to allOffers.
  // Sorting logic: offers with a salary first (salaryMax > 0), descending by salaryMax.
  // Offers without a salary go last, sorted alphabetically by title (locale 'pl')
  private sortBatch(offers: MappedOffer[]): MappedOffer[] {
    return [...offers].sort((a, b) => {
      const aHas = a.salaryMax > 0;
      const bHas = b.salaryMax > 0;
      if (aHas && !bHas) return -1;  // a has a salary, b doesn't - a goes higher
      if (!aHas && bHas) return 1;   // b has a salary, a doesn't - b goes higher
      if (aHas && bHas && a.salaryMax !== b.salaryMax) return b.salaryMax - a.salaryMax; // higher salary first
      return a.title.localeCompare(b.title, 'pl'); // alphabetically for ties
    });
  }

  // Recomputes matchedOffers based on allOffers and currentFilters.
  // Performs client-side filtering (salary range) and enriches offers with matchedTech/matchedRoles.
  // Called on every filter change and after each new page is loaded from the backend
  private computeMatchedOffers(): OfferViewModel[] {
    if (!this.currentFilters) return [];
    const filters = this.currentFilters;
    return this.allOffers
      .filter(offer => this.isSalaryInRange(offer, filters))
      .map(offer => this.toOfferViewModel(offer, filters));
  }

  // Checks whether an offer fits in the selected salary range.
  // Offers without a stated salary (salaryMin === 0 and salaryMax === 0) always pass -
  // hiding them would be bad UX because the employer simply didn't disclose the range, and the offer may be good
  private isSalaryInRange(offer: MappedOffer, filters: FiltersValue): boolean {
    if (offer.salaryMin === 0 && offer.salaryMax === 0) return true;
    return offer.salaryMax >= filters.salaryFrom && offer.salaryMin <= filters.salaryTo;
  }

  // Creates an OfferViewModel from a MappedOffer - extends the offer with matchedTech and matchedRoles.
  // matchedTech - which technologies from the offer the user selected in the filters (for card badges)
  // matchedRoles - which roles from the offer match the user's selected specializations
  private toOfferViewModel(offer: MappedOffer, filters: FiltersValue): OfferViewModel {
    const selectedRoles = this.selectedKeys(filters.itArea);
    const selectedTech  = this.selectedKeys(filters.technologies);
    const matchedRoles  = offer.roles.filter(role => selectedRoles.includes(role));
    const matchedTech   = offer.technologies.filter(tech => selectedTech.includes(tech));
    return { ...offer, matchedRoles, matchedTech };
  }

  // Helper - extracts the keys from a { key: boolean } object where the value === true.
  // Used to read the checked checkboxes from a FormGroup (e.g. itArea, technologies)
  private selectedKeys(group: Record<string, boolean>): string[] {
    return Object.entries(group).filter(([, v]) => v).map(([k]) => k);
  }

  // Getter used in the template by *ngFor - returns matchedOffers (the filtered list to display)
  get displayedOffers(): OfferViewModel[] {
    return this.matchedOffers;
  }

  // trackBy for the offers *ngFor - Angular uses the offer ID to identify DOM elements.
  // Without trackBy Angular would destroy and recreate all list elements on every change,
  // which would be very inefficient with a list of 20+ offers
  trackOffer(_index: number, offer: OfferViewModel): string {
    return offer.id;
  }

  // trackBy for *ngFor over string lists (e.g. the technology list shown in an offer card)
  trackByString(_index: number, value: string): string {
    return value;
  }

  // Called from the template when the user types in the search field
  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.searchTrigger$.next(query); // 500ms debounce - request 500ms after the last keystroke
  }

  // Called when the user clicks the "X" button next to the search field - clears the query
  onSearchClear(): void {
    this.searchQuery = '';
    this.searchTrigger$.next('');
  }

  // Checks whether an offer has a stated salary - used in the template to conditionally
  // render the salary section (when there is no data we show "Nie podano")
  hasSalary(offer: OfferViewModel): boolean {
    return offer.salaryMin > 0 || offer.salaryMax > 0;
  }

  // Opens an offer on the external job board in a new browser tab.
  // noopener - the new tab cannot manipulate the parent window (window.opener)
  // noreferrer - does not send the Referer header to the external site (privacy)
  openOffer(offer: OfferViewModel): void {
    if (offer.url && isPlatformBrowser(this.platformId)) {
      window.open(offer.url, '_blank', 'noopener,noreferrer');
    }
  }

  // Formats a role key (e.g. "backend_developer") into a readable name (e.g. "Backend Developer").
  // Delegated to FiltersFormComponent because it has the lookup data loaded from the backend.
  // If filtersFormRef is not available (SSR/test), we return the raw key as a fallback
  formatRole(key: string): string {
    return this.filtersFormRef?.formatRole(key) ?? key;
  }

  // Formats a technology key (e.g. "typescript") into a readable name (e.g. "TypeScript")
  formatTech(key: string): string {
    return this.filtersFormRef?.formatTech(key) ?? key;
  }

  // Formats a job board key (e.g. "pracuj") into a readable name (e.g. "Pracuj.pl")
  formatSource(source: string): string {
    return this.filtersFormRef?.availableSites.find(s => s.key === source)?.label ?? source;
  }

  // Returns the work mode label (e.g. "hybrid") as a readable name (e.g. "Hybrydowo")
  getWorkModeLabel(workTypeId: string): string {
    return this.filtersFormRef?.availableWorkTypes.find(w => w.id === workTypeId)?.label ?? workTypeId;
  }

  // Fills the filters with data from the logged-in user's profile via GET /v1/users/me/profile.
  // Overrides only seniority and technologies - the rest (salary, location, work mode) stays unchanged.
  // The spread keeps the current filters and selectively overrides only the profile fields.
  async fillFromProfile(): Promise<void> {
    if (!this.isAuthenticated()) return;
    try {
      const profile = await this.userApi.getMyProfile();

      const selectedTechnologies = (profile.technologies ?? []).map((t: { id: string; name: string }) => ({
        id: t.id,
        name: t.name,
      }));
      const expLevelId = profile.exp_level?.id ?? '';

      // Keep the current filters as the base and override only seniority and technologies.
      // technologies is a { id: true } object required by FiltersInitialState (from filters-form.types.ts)
      const nextFilters: FiltersInitialState = {
        ...(this.currentFilters ?? this.initialFilters ?? {}),
        selectedTechnologies,
        technologies: Object.fromEntries(selectedTechnologies.map((t: { id: string }) => [t.id, true])),
        seniority: expLevelId ? { [expLevelId]: true } : {},
      };

      this.initialFilters = nextFilters;
      this.currentFilters = this.filtersFormRef?.computeValue() ?? this.currentFilters;
      // patchValue() updates the filter form - FiltersFormComponent recomputes all IDs
      this.filtersFormRef?.patchValue(nextFilters);
    } catch (error) {
      console.error('Failed to fill filters from profile:', error);
    }
  }

}
