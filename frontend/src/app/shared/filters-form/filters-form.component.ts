import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { LocationItem, LocationPickerComponent } from '../location-picker/location-picker.component';
import { LookupsApiService } from '../../core/services/lookups-api.service';
import { FiltersInitialState, FiltersValue } from './filters-form.types';

const WORK_TYPE_TO_MODE: Record<string, string> = {
  'Praca zdalna': 'remote',
  'Praca hybrydowa': 'hybrid',
  'Praca stacjonarna': 'onsite',
  'Zdalnie': 'remote',
  'Hybrydowo': 'hybrid',
  'Stacjonarnie': 'onsite',
  'Praca mobilna': 'onsite',
};

type LookupItem = { key: string; label: string; id: string };

@Component({
  selector: 'app-filters-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LocationPickerComponent],
  templateUrl: './filters-form.component.html',
  styleUrls: ['./filters-form.component.css'],
})
export class FiltersFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly lookupsApi = inject(LookupsApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() initialFilters: FiltersInitialState | null = null;
  @Input() collapsible = false;
  @Input() showApplyButton = true;
  @Input() applyButtonLabel = 'Szukaj ofert';
  @Input() summaryHeading = 'Filtry';
  @Input() showSummaryHeader = false;
  @Input() previewCount: number | null = null;

  @Output() filtersChange = new EventEmitter<FiltersValue>();
  @Output() applyClicked = new EventEmitter<FiltersValue>();
  @Output() ready = new EventEmitter<FiltersValue>();

  readonly salaryOptions = [
    0, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
    13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 22000,
    25000, 30000, 35000, 40000, 45000, 50000,
  ];
  readonly maxSalaryIndex = this.salaryOptions.length - 1;

  availableRoles: LookupItem[] = [];
  availableTechs: LookupItem[] = [];
  availableSites: LookupItem[] = [];
  availableExpLevels: LookupItem[] = [];
  availableWorkTypes: LookupItem[] = [];
  availableLocations: LocationItem[] = [];
  selectedLocations: LocationItem[] = [];

  filtersForm: FormGroup | null = null;
  isLoading = true;
  loadError: string | null = null;
  collapsed = false;
  showAllRoles = false;
  showAllTech = false;

  ngOnInit(): void {
    forkJoin({
      techs: this.lookupsApi.getTechnologies(),
      specs: this.lookupsApi.getSpecializations(),
      locations: this.lookupsApi.getLocations(),
      sites: this.lookupsApi.getSites(),
      expLevels: this.lookupsApi.getExperienceLevels(),
      workTypes: this.lookupsApi.getWorkTypes(),
    }).subscribe({
      next: ({ techs, specs, locations, sites, expLevels, workTypes }) => {
        this.availableTechs = this.dedupeByKey(
          techs.map(t => ({ key: t.id, label: t.name, id: t.id }))
        );
        this.availableRoles = this.dedupeByKey(specs.map(s => ({ key: s.id, label: s.name, id: s.id })));
        this.availableSites = sites.map(s => ({ key: s.id, label: s.name, id: s.id }));
        this.availableExpLevels = expLevels.map(e => ({ key: e.id, label: e.name, id: e.id }));
        this.availableWorkTypes = workTypes.map(w => ({ key: w.id, label: w.name, id: w.id }));
        this.availableLocations = locations
          .map(l => ({ id: l.id, name: l.name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

        this.selectedLocations = this.initialFilters?.selectedLocations ?? [];
        this.filtersForm = this.buildForm();
        this.subscribeFormChanges();
        this.isLoading = false;
        this.cdr.markForCheck();

        const initial = this.computeValue();
        this.ready.emit(initial);
        this.filtersChange.emit(initial);
      },
      error: () => {
        this.loadError = 'Nie udało się pobrać słowników z backendu.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
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

  private buildForm(): FormGroup {
    const init = this.initialFilters ?? {};

    const itArea: Record<string, boolean> = {};
    for (const r of this.availableRoles) itArea[r.id] = init.itArea?.[r.id] ?? false;

    const technologies: Record<string, boolean> = {};
    for (const t of this.availableTechs) technologies[t.id] = init.technologies?.[t.id] ?? false;

    const jobSites: Record<string, boolean> = {};
    for (const s of this.availableSites) jobSites[s.key] = init.jobSites?.[s.key] ?? true;

    return this.fb.group({
      itArea: this.fb.group(itArea),
      seniority: [this.resolveExpLevelId(init.seniority ?? '')],
      technologies: this.fb.group(technologies),
      workMode: this.fb.group({
        remote: [init.workMode?.['remote'] ?? true],
        hybrid: [init.workMode?.['hybrid'] ?? true],
        onsite: [init.workMode?.['onsite'] ?? false],
      }),
      salaryFromIndex: [init.salaryFromIndex ?? 0],
      salaryToIndex: [init.salaryToIndex ?? this.maxSalaryIndex],
      jobSites: this.fb.group(jobSites),
    });
  }

  private subscribeFormChanges(): void {
    this.filtersForm?.valueChanges.subscribe(() => {
      this.filtersChange.emit(this.computeValue());
    });
  }

  onLocationsChange(locations: LocationItem[]): void {
    this.selectedLocations = locations;
    this.filtersChange.emit(this.computeValue());
  }

  applyFilters(): void {
    this.checkSalaryRange('from');
    this.applyClicked.emit(this.computeValue());
  }

  patchValue(filters: FiltersInitialState, locations?: LocationItem[]): void {
    if (!this.filtersForm) {
      this.initialFilters = filters;
      if (locations) this.selectedLocations = locations;
      return;
    }
    this.filtersForm.patchValue(filters);
    if (locations) this.selectedLocations = locations;
  }

  computeValue(): FiltersValue {
    const raw = this.filtersForm?.getRawValue() ?? {};
    const itArea: Record<string, boolean> = raw.itArea ?? {};
    const technologies: Record<string, boolean> = raw.technologies ?? {};
    const jobSites: Record<string, boolean> = raw.jobSites ?? {};
    const workMode: Record<string, boolean> = raw.workMode ?? { remote: true, hybrid: true, onsite: false };

    const specializationIds = this.availableRoles.filter(r => itArea[r.id]).map(r => r.id);
    const technologyIds = this.availableTechs.filter(t => technologies[t.id]).map(t => t.id);

    const allSiteKeys = this.availableSites.map(s => s.key);
    const selectedSiteKeys = allSiteKeys.filter(k => jobSites[k]);
    const siteIds = (selectedSiteKeys.length === 0 || selectedSiteKeys.length === allSiteKeys.length)
      ? []
      : this.availableSites.filter(s => selectedSiteKeys.includes(s.key) && s.id).map(s => s.id);

    const seniority = (raw.seniority as string) ?? '';
    const expLevelIds = this.availableExpLevels.some(e => e.id === seniority) ? [seniority] : [];

    const selectedModes = (Object.entries(workMode) as [string, boolean][])
      .filter(([, v]) => v).map(([m]) => m);
    const workTypeIds = (selectedModes.length === 0 || selectedModes.length === Object.keys(workMode).length)
      ? []
      : this.availableWorkTypes
          .filter(wt => {
            const mode = WORK_TYPE_TO_MODE[wt.label];
            return mode && selectedModes.includes(mode) && wt.id;
          })
          .map(wt => wt.id);

    const locationIds = this.selectedLocations.filter(l => l.id).map(l => l.id);
    const salaryFrom = this.salaryOptions[Number(raw.salaryFromIndex) || 0] ?? 0;
    const salaryTo = this.salaryOptions[Number(raw.salaryToIndex) || this.maxSalaryIndex] ?? 0;

    return {
      itArea, technologies, jobSites, workMode,
      seniority,
      salaryFromIndex: Number(raw.salaryFromIndex) || 0,
      salaryToIndex: Number(raw.salaryToIndex) || this.maxSalaryIndex,
      selectedLocations: this.selectedLocations,
      specializationIds, technologyIds, expLevelIds, workTypeIds, siteIds, locationIds,
      salaryFrom, salaryTo,
    };
  }

  private resolveExpLevelId(value: string): string {
    if (!value) return '';
    if (this.availableExpLevels.some(e => e.id === value)) return value;
    return this.availableExpLevels.find(e => e.label === value)?.id ?? '';
  }

  getWorkModeKey(label: string): string {
    return WORK_TYPE_TO_MODE[label] ?? 'remote';
  }

  formatRole(id: string): string {
    return this.availableRoles.find(r => r.id === id)?.label ?? id;
  }

  formatTech(id: string): string {
    return this.availableTechs.find(t => t.id === id)?.label ?? id;
  }

  getVisibleRoles(): LookupItem[] {
    return this.showAllRoles ? this.availableRoles : this.availableRoles.slice(0, 8);
  }

  getVisibleTechnologies(): LookupItem[] {
    return this.showAllTech ? this.availableTechs : this.availableTechs.slice(0, 10);
  }

  get salaryFromValue(): number {
    return this.salaryOptions[Number(this.filtersForm?.get('salaryFromIndex')?.value) || 0] ?? 0;
  }

  get salaryToValue(): number {
    return this.salaryOptions[Number(this.filtersForm?.get('salaryToIndex')?.value) || this.maxSalaryIndex] ?? 0;
  }

  getSalaryProgressPercent(): number {
    const maxValue = this.salaryOptions[this.maxSalaryIndex];
    return ((this.salaryToValue - this.salaryFromValue) / maxValue) * 100;
  }

  getSalaryProgressLeft(): number {
    const maxValue = this.salaryOptions[this.maxSalaryIndex];
    return (this.salaryFromValue / maxValue) * 100;
  }

  checkSalaryRange(type: 'from' | 'to'): void {
    const fromCtrl = this.filtersForm?.get('salaryFromIndex');
    const toCtrl = this.filtersForm?.get('salaryToIndex');
    if (!fromCtrl || !toCtrl) return;
    const from = Number(fromCtrl.value);
    const to = Number(toCtrl.value);
    if (type === 'from' && from >= to) {
      fromCtrl.setValue(Math.max(0, to - 1), { emitEvent: false });
    } else if (type === 'to' && to <= from) {
      toCtrl.setValue(Math.min(this.maxSalaryIndex, from + 1), { emitEvent: false });
    }
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
  }
}
