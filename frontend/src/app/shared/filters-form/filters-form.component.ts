// Filter form component - used on /offers (sidebar), /home and /profile.
// Fetches lookup data from the backend via LookupsApiService, builds a dynamic ReactiveForm
// and emits FiltersValue on every change. Types live in filters-form.types.ts.
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { forkJoin, of, Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

import { LocationItem, LocationPickerComponent } from '../location-picker/location-picker.component';
import { TechPickerComponent } from '../tech-picker/tech-picker.component';
import { LookupsApiService } from '../../core/services/lookups-api.service';
import { FiltersInitialState, FiltersValue } from './filters-form.types';

// Internal type for the selection list items (roles, technologies, job boards, experience levels).
type LookupItem = { key: string; label: string; id: string };

// Predefined salary slider values in PLN (irregular step - denser at lower amounts).
// The index into this array is stored in the FormGroup, not the PLN amount.
export const SALARY_OPTIONS = [
  0, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
  13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 22000,
  25000, 30000, 35000, 40000, 45000, 50000,
];
// Exported - offers.component.ts checks whether the salary filter is at the default maximum
export const MAX_SALARY_INDEX = SALARY_OPTIONS.length - 1;

@Component({
  selector: 'app-filters-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LocationPickerComponent, TechPickerComponent],
  templateUrl: './filters-form.component.html',
  styleUrls: ['./filters-form.component.css'],
})
export class FiltersFormComponent implements OnInit, OnChanges, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly fb = inject(FormBuilder);
  private readonly lookupsApi = inject(LookupsApiService);
  // ChangeDetectorRef - manual refresh after queueMicrotask (outside the Angular cycle)
  private readonly cdr = inject(ChangeDetectorRef);

  // null = no saved state, the form starts from default values
  @Input() initialFilters: FiltersInitialState | null = null;
  @Input() collapsible = false;
  @Input() showApplyButton = true;
  @Input() applyButtonLabel = 'Szukaj ofert';
  @Input() summaryHeading = 'Filtry';
  @Input() showSummaryHeader = false;
  @Input() initialCollapsed = false;

  // Section visibility flags - let the same component be reused in different contexts
  @Input() showLocation = true;
  @Input() showExpLevel = true;
  @Input() showWorkMode = true;
  @Input() showSalary = true;
  @Input() showRoles = true;
  @Input() showTechnologies = true;
  @Input() showSites = true;
  // When true, only one experience level can be selected at a time (radio instead of checkbox).
  // Used in profile.component where a single seniority level is chosen
  @Input() singleExpLevelSelection = false;
  @Input() showProfileFillButton = false;
  @Input() profileFillButtonLabel = 'Uzupełnij z profilu';
  @Input() profileFillButtonPosition: 'top' | 'above-technologies' | 'header-right' = 'top';

  @Output() profileFillClicked = new EventEmitter<void>();
  @Output() filtersChange = new EventEmitter<FiltersValue>();
  @Output() applyClicked = new EventEmitter<FiltersValue>();
  // Emitted once after initialization completes - offers.component waits for it before the first load
  @Output() ready = new EventEmitter<FiltersValue>();

  // Exposed via readonly fields so they are available in the HTML template
  readonly salaryOptions = SALARY_OPTIONS;
  readonly maxSalaryIndex = MAX_SALARY_INDEX;

  // Option lists fetched from the backend - empty until forkJoin completes
  availableRoles: LookupItem[] = [];
  availableTechs: LookupItem[] = [];
  availableTechItems: LocationItem[] = []; // the same technologies in {id, name} format for TechPicker
  availableSites: LookupItem[] = [];
  availableExpLevels: LookupItem[] = [];
  availableWorkTypes: LookupItem[] = [];
  availableLocations: LocationItem[] = [];

  // Locations and technologies kept OUTSIDE the FormGroup - the pickers have their own state
  selectedLocations: LocationItem[] = [];
  selectedTechnologies: LocationItem[] = [];

  // filtersForm is null until forkJoin finishes fetching - the FormGroup needs the API data
  filtersForm: FormGroup | null = null;
  isLoading = true;
  loadError: string | null = null;
  collapsed = false;
  showAllRoles = false;
  // Two-step rendering flag for TechPicker - see queueMicrotask in ngOnInit
  techPickerReady = false;

  onProfileFillClick(): void {
    this.profileFillClicked.emit();
  }

  ngOnInit(): void {
    this.collapsed = this.collapsible && this.initialCollapsed;

    // forkJoin fires all requests in parallel and waits until they all complete.
    // of([]) as a fallback when a section is hidden via @Input (e.g. showRoles = false)
    forkJoin({
      techs:     this.showTechnologies ? this.lookupsApi.getTechnologies().pipe(catchError(() => of([])))     : of([]),
      specs:     this.showRoles        ? this.lookupsApi.getSpecializations().pipe(catchError(() => of([])))  : of([]),
      locations: this.showLocation     ? this.lookupsApi.getLocations().pipe(catchError(() => of([])))        : of([]),
      sites:     this.showSites        ? this.lookupsApi.getSites().pipe(catchError(() => of([])))            : of([]),
      expLevels: this.showExpLevel     ? this.lookupsApi.getExperienceLevels().pipe(catchError(() => of([]))) : of([]),
      workTypes: this.showWorkMode     ? this.lookupsApi.getWorkTypes().pipe(catchError(() => of([])))        : of([]),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ techs, specs, locations, sites, expLevels, workTypes }) => {
        // dedupeByKey removes duplicates the backend sometimes returns (the same ID several times)
        this.availableTechs = this.dedupeByKey(
          techs.map(t => ({ key: t.id, label: t.name, id: t.id }))
        );
        this.availableTechItems = this.availableTechs.map(t => ({ id: t.id, name: t.label }));

        this.availableRoles = this.dedupeByKey(
          specs.map(s => ({ key: s.id, label: s.name, id: s.id }))
        );

        this.availableSites     = sites.map(s => ({ key: s.id, label: s.name, id: s.id }));
        this.availableExpLevels = expLevels.map(e => ({ key: e.id, label: e.name, id: e.id }));
        this.availableWorkTypes = workTypes.map(w => ({ key: w.id, label: w.name, id: w.id }));

        // Sort alphabetically using Polish collation for nicer autocomplete
        this.availableLocations = locations
          .map(l => ({ id: l.id, name: l.name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

        this.selectedLocations    = this.restoreSelectedLocations(this.initialFilters ?? {});
        this.selectedTechnologies = [...this.restoreSelectedTechs(this.initialFilters ?? {})];

        this.filtersForm = this.buildForm();
        this.subscribeFormChanges();
        this.isLoading = false;

        // Two-step render of TechPickerComponent - first hide it, run change detection,
        // then in queueMicrotask show it with selectedTechnologies already set.
        // Without this TechPicker renders before selectedTechnologies is populated.
        this.techPickerReady = false;
        this.cdr.detectChanges();

        // queueMicrotask runs the callback after the current change detection cycle,
        // but before the next frame - a safe place to emit ready and show TechPicker
        queueMicrotask(() => {
          this.techPickerReady = true;
          this.cdr.detectChanges();

          const initial = this.computeValue();
          this.ready.emit(initial);
          this.filtersChange.emit(initial);
        });
      },
      error: () => {
        this.loadError = 'Nie udało się pobrać danych z serwera.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // Priority: selectedLocations (objects) > locationIds (array of IDs to look up)
  private restoreSelectedLocations(init: FiltersInitialState): LocationItem[] {
    if (init.selectedLocations?.length) return init.selectedLocations;
    if (init.locationIds?.length) {
      return this.availableLocations.filter(l => init.locationIds!.includes(l.id));
    }
    return [];
  }

  // Priority: selectedTechnologies (objects) > technologies (old Record<id, boolean>)
  private restoreSelectedTechs(init: FiltersInitialState): LocationItem[] {
    if (init.selectedTechnologies?.length) return init.selectedTechnologies;
    // backward compat: restore from old Record<string, boolean> format
    if (init.technologies) {
      return this.availableTechItems.filter(t => init.technologies![t.id]);
    }
    return [];
  }

  private dedupeByKey(items: LookupItem[]): LookupItem[] {
    const seen = new Set<string>();
    const out: LookupItem[] = [];
    for (const item of items) {
      if (seen.has(item.key)) continue;
      seen.add(item.key);
      out.push(item);
    }
    return out;
  }

  // Builds the initial values for the FormGroup from initialFilters.
  // jobSiteKeys (new array format) takes precedence over jobSites (old boolean object)
  private buildFilterValues(init: FiltersInitialState): {
    itArea: Record<string, boolean>;
    jobSites: Record<string, boolean>;
    seniority: Record<string, boolean>;
    workMode: Record<string, boolean>;
    salaryFromIndex: number;
    salaryToIndex: number;
  } {
    const itArea: Record<string, boolean> = {};
    for (const r of this.availableRoles) itArea[r.id] = init.itArea?.[r.id] ?? false;

    const jobSites: Record<string, boolean> = {};
    const jobSiteKeys = init.jobSiteKeys;
    for (const s of this.availableSites) {
      jobSites[s.key] = jobSiteKeys !== undefined
        ? jobSiteKeys.includes(s.key)
        : (init.jobSites?.[s.key] ?? false);
    }

    const seniority: Record<string, boolean> = {};
    for (const e of this.availableExpLevels) seniority[e.id] = init.seniority?.[e.id] ?? false;

    // workModeIds (new array format) takes precedence over workMode (old boolean object)
    const workModeIds = init.workModeIds;
    const workMode: Record<string, boolean> = {};
    for (const wt of this.availableWorkTypes) {
      workMode[wt.id] = workModeIds !== undefined
        ? workModeIds.includes(wt.id)
        : (init.workMode?.[wt.id] ?? false);
    }

    return {
      itArea, jobSites, seniority, workMode,
      salaryFromIndex: init.salaryFromIndex ?? 0,
      salaryToIndex:   init.salaryToIndex   ?? this.maxSalaryIndex,
    };
  }

  private buildForm(): FormGroup {
    const v = this.buildFilterValues(this.initialFilters ?? {});
    return this.fb.group({
      itArea:          this.fb.group(v.itArea),
      seniority:       this.fb.group(v.seniority),
      workMode:        this.fb.group(v.workMode),
      salaryFromIndex: [v.salaryFromIndex],
      salaryToIndex:   [v.salaryToIndex],
      jobSites:        this.fb.group(v.jobSites),
    });
  }

  // Locations and technologies are NOT in the FormGroup - they have separate handlers
  private subscribeFormChanges(): void {
    this.filtersForm?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.filtersChange.emit(this.computeValue());
    });
  }

  onLocationsChange(locations: LocationItem[]): void {
    this.selectedLocations = locations;
    this.filtersChange.emit(this.computeValue());
  }

  onTechnologiesChange(technologies: LocationItem[]): void {
    this.selectedTechnologies = technologies;
    this.filtersChange.emit(this.computeValue());
  }

  applyFilters(): void {
    this.checkSalaryRange('from');
    this.applyClicked.emit(this.computeValue());
  }

  // Public method called by the parent (offers, home) to update the form.
  // { emitEvent: false } prevents a double emit - we emit manually via filtersChange at the end
  patchValue(filters: FiltersInitialState, locations?: LocationItem[]): void {
    if (!this.filtersForm) {
      // FormGroup not built yet - remember the values and apply them in ngOnInit
      this.initialFilters = filters;
      if (locations) this.selectedLocations = locations;
      return;
    }

    this.selectedLocations    = locations ?? this.restoreSelectedLocations(filters);
    this.selectedTechnologies = this.restoreSelectedTechs(filters);

    this.filtersForm.patchValue(this.buildPatchValue(filters), { emitEvent: false });
    this.filtersChange.emit(this.computeValue());
  }

  // Converts the raw FormGroup state into a FiltersValue with ID arrays ready for the API.
  // siteIds and workTypeIds are empty when all or none of the options are checked (no filter)
  computeValue(): FiltersValue {
    const raw = this.filtersForm?.getRawValue() ?? {};
    const itArea:    Record<string, boolean> = raw.itArea    ?? {};
    const jobSites:  Record<string, boolean> = raw.jobSites  ?? {};
    const workMode:  Record<string, boolean> = raw.workMode  ?? {};

    const specializationIds = this.availableRoles.filter(r => itArea[r.id]).map(r => r.id);

    const technologyIds = this.selectedTechnologies.map(t => t.id);
    const technologies: Record<string, boolean> = Object.fromEntries(
      this.availableTechs.map(t => [t.id, technologyIds.includes(t.id)])
    );

    // Empty when none or all boards are checked - the backend treats it as no filter
    const allSiteKeys      = this.availableSites.map(s => s.key);
    const selectedSiteKeys = allSiteKeys.filter(k => jobSites[k]);
    const siteIds = (selectedSiteKeys.length === 0 || selectedSiteKeys.length === allSiteKeys.length)
      ? []
      : this.availableSites.filter(s => selectedSiteKeys.includes(s.key) && s.id).map(s => s.id);

    const seniority:  Record<string, boolean> = raw.seniority ?? {};
    const expLevelIds = this.availableExpLevels.filter(e => seniority[e.id]).map(e => e.id);

    // Same as siteIds - empty when none or all work modes are checked
    const selectedModes = Object.entries(workMode).filter(([, v]) => v).map(([id]) => id);
    const workTypeIds = (selectedModes.length === 0 || selectedModes.length === Object.keys(workMode).length)
      ? []
      : selectedModes;

    const locationIds = this.selectedLocations.filter(l => l.id).map(l => l.id);
    const salaryFrom = this.salaryOptions[Number(raw.salaryFromIndex) || 0] ?? 0;
    const salaryTo   = this.salaryOptions[Number(raw.salaryToIndex)   || this.maxSalaryIndex] ?? 0;

    return {
      itArea, technologies, jobSites, workMode, seniority,
      salaryFromIndex: Number(raw.salaryFromIndex) || 0,
      salaryToIndex:   Number(raw.salaryToIndex)   || this.maxSalaryIndex,
      selectedLocations:     this.selectedLocations,
      selectedTechnologies:  this.selectedTechnologies,
      specializationIds, technologyIds, expLevelIds, workTypeIds, siteIds, locationIds,
      salaryFrom, salaryTo,
    };
  }

  formatRole(id: string): string {
    return this.availableRoles.find(r => r.id === id)?.label ?? id;
  }

  formatTech(id: string): string {
    return this.availableTechs.find(t => t.id === id)?.label ?? id;
  }

  // Shows only the first 8 roles by default - the form doesn't grow with many specializations
  getVisibleRoles(): LookupItem[] {
    return this.showAllRoles ? this.availableRoles : this.availableRoles.slice(0, 8);
  }

  get salaryFromValue(): number {
    return this.salaryOptions[Number(this.filtersForm?.get('salaryFromIndex')?.value) || 0] ?? 0;
  }

  get salaryToValue(): number {
    return this.salaryOptions[Number(this.filtersForm?.get('salaryToIndex')?.value) || this.maxSalaryIndex] ?? 0;
  }

  // Width of the colored salary slider bar in percent (from the "from" index to the "to" index)
  getSalaryProgressPercent(): number {
    const fromIndex = Number(this.filtersForm?.get('salaryFromIndex')?.value) || 0;
    const toIndex   = Number(this.filtersForm?.get('salaryToIndex')?.value)   || this.maxSalaryIndex;
    return ((toIndex - fromIndex) / this.maxSalaryIndex) * 100;
  }

  // Offset of the bar from the left edge of the slider in percent
  getSalaryProgressLeft(): number {
    const fromIndex = Number(this.filtersForm?.get('salaryFromIndex')?.value) || 0;
    return (fromIndex / this.maxSalaryIndex) * 100;
  }

  // Prevents the sliders from crossing - the "from" slider cannot be >= the "to" slider.
  // { emitEvent: false } - the correction should not trigger another valueChanges subscription
  checkSalaryRange(type: 'from' | 'to'): void {
    const fromCtrl = this.filtersForm?.get('salaryFromIndex');
    const toCtrl   = this.filtersForm?.get('salaryToIndex');
    if (!fromCtrl || !toCtrl) return;
    const from = Number(fromCtrl.value);
    const to   = Number(toCtrl.value);
    if (type === 'from' && from >= to) {
      fromCtrl.setValue(Math.max(0, to - 1), { emitEvent: false });
    } else if (type === 'to' && to <= from) {
      toCtrl.setValue(Math.min(this.maxSalaryIndex, from + 1), { emitEvent: false });
    }
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
  }

  // Radio mode for seniority - sets the chosen level to true and all the others to false.
  // { emitEvent: false } prevents triggering subscribeFormChanges - we emit manually at the end
  onSingleExpLevelSelect(selectedId: string): void {
    const seniorityGroup = this.filtersForm?.get('seniority') as FormGroup | null;
    if (!seniorityGroup) return;

    Object.keys(seniorityGroup.controls).forEach(id => {
      seniorityGroup.get(id)?.setValue(id === selectedId, { emitEvent: false });
    });

    this.filtersChange.emit(this.computeValue());
  }

  // Reacts to an external change of @Input() initialFilters (e.g. when the parent refreshes data).
  // When the form does not exist yet, ngOnInit applies the changes itself on initialization
  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['initialFilters'] || !this.filtersForm) return;

    const next = changes['initialFilters'].currentValue as FiltersInitialState | null;
    if (!next) return;

    this.selectedLocations    = this.restoreSelectedLocations(next);
    this.selectedTechnologies = this.restoreSelectedTechs(next);

    // { emitEvent: false } - we don't want a double emit from valueChanges and the manual filtersChange
    const patch = this.buildPatchValue(next);
    this.filtersForm.patchValue(patch, { emitEvent: false });

    this.filtersChange.emit(this.computeValue());
    this.cdr.markForCheck();
  }

  private buildPatchValue(init: FiltersInitialState): Record<string, unknown> {
    return this.buildFilterValues(init);
  }

  isExpLevelSelected(id: string): boolean {
    const seniorityGroup = this.filtersForm?.get('seniority') as FormGroup | null;
    return !!seniorityGroup?.get(id)?.value;
  }

  get seniorityGroup(): FormGroup | null {
    return (this.filtersForm?.get('seniority') as FormGroup) ?? null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
