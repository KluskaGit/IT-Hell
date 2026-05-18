import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';

import { LocationItem, LocationPickerComponent } from '../location-picker/location-picker.component';
import { TechPickerComponent } from '../tech-picker/tech-picker.component';
import { LookupsApiService } from '../../core/services/lookups-api.service';
import { CvApiService } from '../../core/services/cv-api.service';
import { FiltersInitialState, FiltersValue } from './filters-form.types';

type LookupItem = { key: string; label: string; id: string };

export const SALARY_OPTIONS = [
  0, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
  13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 22000,
  25000, 30000, 35000, 40000, 45000, 50000,
];
export const MAX_SALARY_INDEX = SALARY_OPTIONS.length - 1;

@Component({
  selector: 'app-filters-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LocationPickerComponent, TechPickerComponent],
  templateUrl: './filters-form.component.html',
  styleUrls: ['./filters-form.component.css'],
})
export class FiltersFormComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly lookupsApi = inject(LookupsApiService);
  private readonly cvApi = inject(CvApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() initialFilters: FiltersInitialState | null = null;
  @Input() collapsible = false;
  @Input() showApplyButton = true;
  @Input() applyButtonLabel = 'Szukaj ofert';
  @Input() summaryHeading = 'Filtry';
  @Input() showSummaryHeader = false;
  @Input() initialCollapsed = false;


  @Input() showLocation = true;
  @Input() showExpLevel = true;
  @Input() showWorkMode = true;
  @Input() showSalary = true;
  @Input() showRoles = true;
  @Input() showTechnologies = true;
  @Input() showSites = true;
  @Input() singleExpLevelSelection = false;
  @Input() showCvUpload = false;
  @Input() techPickerMaxTags = 999;
  @Input() collapsibleSections = false;
  @Input() showProfileFillButton = false;
  @Input() profileFillButtonLabel = 'Uzupełnij z profilu';
  @Input() profileFillButtonPosition: 'top' | 'above-technologies' | 'header-right' = 'top';

  @Output() profileFillClicked = new EventEmitter<void>();
  @Output() filtersChange = new EventEmitter<FiltersValue>();
  @Output() applyClicked = new EventEmitter<FiltersValue>();
  @Output() ready = new EventEmitter<FiltersValue>();

  readonly salaryOptions = SALARY_OPTIONS;
  readonly maxSalaryIndex = MAX_SALARY_INDEX;

  availableRoles: LookupItem[] = [];
  availableTechs: LookupItem[] = [];
  availableTechItems: LocationItem[] = [];
  availableSites: LookupItem[] = [];
  availableExpLevels: LookupItem[] = [];
  availableWorkTypes: LookupItem[] = [];
  availableLocations: LocationItem[] = [];
  selectedLocations: LocationItem[] = [];
  selectedTechnologies: LocationItem[] = [];

  filtersForm: FormGroup | null = null;
  isLoading = true;
  loadError: string | null = null;
  collapsed = false;
  showAllRoles = false;
  techPickerReady = false;

  cvSelectedFile: File | null = null;
  cvIsDragging = false;
  cvIsScanning = false;
  cvScanProgress = 0;
  cvScanStatus = '';
  cvScanComplete = false;

  onProfileFillClick(): void {
    this.profileFillClicked.emit();
  }

  ngOnInit(): void {
    this.collapsed = this.collapsible && this.initialCollapsed;
    this.loadSectionState();
    forkJoin({
      techs: this.showTechnologies ? this.lookupsApi.getTechnologies() : of([]),
      specs: this.showRoles ? this.lookupsApi.getSpecializations() : of([]),
      locations: this.showLocation ? this.lookupsApi.getLocations() : of([]),
      sites: this.showSites ? this.lookupsApi.getSites() : of([]),
      expLevels: this.showExpLevel ? this.lookupsApi.getExperienceLevels() : of([]),
      workTypes: this.showWorkMode ? this.lookupsApi.getWorkTypes() : of([]),
    }).subscribe({
      next: ({ techs, specs, locations, sites, expLevels, workTypes }) => {
        this.availableTechs = this.dedupeByKey(
          techs.map(t => ({ key: t.id, label: t.name, id: t.id }))
        );
        this.availableTechItems = this.availableTechs.map(t => ({ id: t.id, name: t.label }));

        this.availableRoles = this.dedupeByKey(
          specs.map(s => ({ key: s.id, label: s.name, id: s.id }))
        );

        this.availableSites = sites.map(s => ({ key: s.id, label: s.name, id: s.id }));
        this.availableExpLevels = expLevels.map(e => ({ key: e.id, label: e.name, id: e.id }));
        this.availableWorkTypes = workTypes.map(w => ({ key: w.id, label: w.name, id: w.id }));

        this.availableLocations = locations
          .map(l => ({ id: l.id, name: l.name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

        this.selectedLocations = this.restoreSelectedLocations(this.initialFilters ?? {});
        this.selectedTechnologies = [...this.restoreSelectedTechs(this.initialFilters ?? {})];

        this.filtersForm = this.buildForm();
        this.subscribeFormChanges();
        this.isLoading = false;

        this.techPickerReady = false;
        this.cdr.detectChanges();

        queueMicrotask(() => {
          this.techPickerReady = true;
          this.cdr.detectChanges();

          const initial = this.computeValue();
          this.ready.emit(initial);
          this.filtersChange.emit(initial);
        });
      },
      error: () => {
        this.loadError = 'Nie udało się pobrać słowników z backendu.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private restoreSelectedLocations(init: FiltersInitialState): LocationItem[] {
    if (init.selectedLocations?.length) return init.selectedLocations;
    if (init.locationIds?.length) {
      return this.availableLocations.filter(l => init.locationIds!.includes(l.id));
    }
    return [];
  }

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

  private buildForm(): FormGroup {
    const init = this.initialFilters ?? {};

    const itArea: Record<string, boolean> = {};
    for (const r of this.availableRoles) itArea[r.id] = init.itArea?.[r.id] ?? false;

    const jobSites: Record<string, boolean> = {};
    const jobSiteKeys = init.jobSiteKeys;
    for (const s of this.availableSites) {
      jobSites[s.key] = jobSiteKeys !== undefined
        ? jobSiteKeys.includes(s.key)
        : (init.jobSites?.[s.key] ?? true);
    }

    const seniority: Record<string, boolean> = {};
    for (const e of this.availableExpLevels) seniority[e.id] = init.seniority?.[e.id] ?? false;

    const workModeIds = init.workModeIds;
    return this.fb.group({
      itArea: this.fb.group(itArea),
      seniority: this.fb.group(seniority),
      workMode: this.fb.group(
        Object.fromEntries(this.availableWorkTypes.map(wt => [
          wt.id,
          [workModeIds !== undefined ? workModeIds.includes(wt.id) : (init.workMode?.[wt.id] ?? true)],
        ]))
      ),
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

  onTechnologiesChange(technologies: LocationItem[]): void {
    this.selectedTechnologies = technologies;
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

    this.selectedLocations = locations ?? this.restoreSelectedLocations(filters);
    this.selectedTechnologies = this.restoreSelectedTechs(filters);

    this.filtersForm.patchValue(this.buildPatchValue(filters), { emitEvent: false });
    this.filtersChange.emit(this.computeValue());
  }

  computeValue(): FiltersValue {
    const raw = this.filtersForm?.getRawValue() ?? {};
    const itArea: Record<string, boolean> = raw.itArea ?? {};
    const jobSites: Record<string, boolean> = raw.jobSites ?? {};
    const workMode: Record<string, boolean> = raw.workMode ?? {};

    const specializationIds = this.availableRoles.filter(r => itArea[r.id]).map(r => r.id);

    const technologyIds = this.selectedTechnologies.map(t => t.id);
    const technologies: Record<string, boolean> = Object.fromEntries(
      this.availableTechs.map(t => [t.id, technologyIds.includes(t.id)])
    );

    const allSiteKeys = this.availableSites.map(s => s.key);
    const selectedSiteKeys = allSiteKeys.filter(k => jobSites[k]);
    const siteIds = (selectedSiteKeys.length === 0 || selectedSiteKeys.length === allSiteKeys.length)
      ? []
      : this.availableSites.filter(s => selectedSiteKeys.includes(s.key) && s.id).map(s => s.id);

    const seniority: Record<string, boolean> = raw.seniority ?? {};
    const expLevelIds = this.availableExpLevels.filter(e => seniority[e.id]).map(e => e.id);

    const selectedModes = Object.entries(workMode).filter(([, v]) => v).map(([id]) => id);
    const workTypeIds = (selectedModes.length === 0 || selectedModes.length === Object.keys(workMode).length)
      ? []
      : selectedModes;

    const locationIds = this.selectedLocations.filter(l => l.id).map(l => l.id);
    const salaryFrom = this.salaryOptions[Number(raw.salaryFromIndex) || 0] ?? 0;
    const salaryTo = this.salaryOptions[Number(raw.salaryToIndex) || this.maxSalaryIndex] ?? 0;

    return {
      itArea, technologies, jobSites, workMode,
      seniority,
      salaryFromIndex: Number(raw.salaryFromIndex) || 0,
      salaryToIndex: Number(raw.salaryToIndex) || this.maxSalaryIndex,
      selectedLocations: this.selectedLocations,
      selectedTechnologies: this.selectedTechnologies,
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

  getVisibleRoles(): LookupItem[] {
    return this.showAllRoles ? this.availableRoles : this.availableRoles.slice(0, 8);
  }

  get salaryFromValue(): number {
    return this.salaryOptions[Number(this.filtersForm?.get('salaryFromIndex')?.value) || 0] ?? 0;
  }

  get salaryToValue(): number {
    return this.salaryOptions[Number(this.filtersForm?.get('salaryToIndex')?.value) || this.maxSalaryIndex] ?? 0;
  }

  getSalaryProgressPercent(): number {
    const fromIndex = Number(this.filtersForm?.get('salaryFromIndex')?.value) || 0;
    const toIndex = Number(this.filtersForm?.get('salaryToIndex')?.value) || this.maxSalaryIndex;
    return ((toIndex - fromIndex) / this.maxSalaryIndex) * 100;
  }

  getSalaryProgressLeft(): number {
    const fromIndex = Number(this.filtersForm?.get('salaryFromIndex')?.value) || 0;
    return (fromIndex / this.maxSalaryIndex) * 100;
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

  private readonly LS_COLLAPSED = 'cv_filter_collapsed';
  private readonly LS_EXPANDED  = 'cv_filter_expanded';

  collapsedSections = new Set<string>();

  toggleSection(name: string): void {
    if (this.collapsedSections.has(name)) {
      this.collapsedSections.delete(name);
    } else {
      this.collapsedSections.add(name);
    }
    this.saveSectionState();
  }

  isSectionCollapsed(name: string): boolean {
    return this.collapsedSections.has(name);
  }

  readonly FILTER_LIMIT = 4;
  expandedFilterSections = new Set<string>();

  toggleFilterExpand(section: string, event: Event): void {
    event.stopPropagation();
    if (this.expandedFilterSections.has(section)) {
      this.expandedFilterSections.delete(section);
    } else {
      this.expandedFilterSections.add(section);
    }
    this.saveSectionState();
  }

  isFilterExpanded(section: string): boolean {
    return this.expandedFilterSections.has(section);
  }

  sliceItems<T>(items: T[], section: string): T[] {
    return this.isFilterExpanded(section) ? items : items.slice(0, this.FILTER_LIMIT);
  }

  private saveSectionState(): void {
    try {
      localStorage.setItem(this.LS_COLLAPSED, JSON.stringify([...this.collapsedSections]));
      localStorage.setItem(this.LS_EXPANDED,  JSON.stringify([...this.expandedFilterSections]));
    } catch { /* ignore */ }
  }

  private loadSectionState(): void {
    try {
      const collapsed = localStorage.getItem(this.LS_COLLAPSED);
      if (collapsed) this.collapsedSections = new Set(JSON.parse(collapsed));
      const expanded = localStorage.getItem(this.LS_EXPANDED);
      if (expanded) this.expandedFilterSections = new Set(JSON.parse(expanded));
    } catch { /* ignore */ }
  }
  onSingleExpLevelSelect(selectedId: string): void {
    const seniorityGroup = this.filtersForm?.get('seniority') as FormGroup | null;
    if (!seniorityGroup) return;

    Object.keys(seniorityGroup.controls).forEach(id => {
      seniorityGroup.get(id)?.setValue(id === selectedId, { emitEvent: false });
    });

    this.filtersChange.emit(this.computeValue());
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['initialFilters'] || !this.filtersForm) return;

    const next = changes['initialFilters'].currentValue as FiltersInitialState | null;
    if (!next) return;

    this.selectedLocations = this.restoreSelectedLocations(next);
    this.selectedTechnologies = this.restoreSelectedTechs(next);

    const patch = this.buildPatchValue(next);
    this.filtersForm.patchValue(patch, { emitEvent: false });

    this.filtersChange.emit(this.computeValue());
    this.cdr.markForCheck();
  }

  private buildPatchValue(init: FiltersInitialState): Record<string, unknown> {
    const itArea: Record<string, boolean> = {};
    for (const r of this.availableRoles) {
      itArea[r.id] = init.itArea?.[r.id] ?? false;
    }

    const jobSites: Record<string, boolean> = {};
    const jobSiteKeys = init.jobSiteKeys;
    for (const s of this.availableSites) {
      jobSites[s.key] = jobSiteKeys !== undefined
        ? jobSiteKeys.includes(s.key)
        : (init.jobSites?.[s.key] ?? true);
    }

    const seniority: Record<string, boolean> = {};
    for (const e of this.availableExpLevels) {
      seniority[e.id] = init.seniority?.[e.id] ?? false;
    }

    const workModeIds = init.workModeIds;
    const workMode: Record<string, boolean> = {};
    for (const wt of this.availableWorkTypes) {
      workMode[wt.id] = workModeIds !== undefined
        ? workModeIds.includes(wt.id)
        : (init.workMode?.[wt.id] ?? false);
    }

    return {
      itArea,
      seniority,
      workMode,
      salaryFromIndex: init.salaryFromIndex ?? 0,
      salaryToIndex: init.salaryToIndex ?? this.maxSalaryIndex,
      jobSites,
    };
  }
  isExpLevelSelected(id: string): boolean {
    const seniorityGroup = this.filtersForm?.get('seniority') as FormGroup | null;
    return !!seniorityGroup?.get(id)?.value;
  }
  get seniorityGroup(): FormGroup {
    return this.filtersForm?.get('seniority') as FormGroup;
  }

  cvOnDragOver(e: DragEvent): void { e.preventDefault(); this.cvIsDragging = true; }
  cvOnDragLeave(e: DragEvent): void { e.preventDefault(); this.cvIsDragging = false; }
  cvOnDrop(e: DragEvent): void {
    e.preventDefault(); this.cvIsDragging = false;
    if (e.dataTransfer?.files.length) this.cvHandleFile(e.dataTransfer.files[0]);
  }
  cvOnFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) this.cvHandleFile(input.files[0]);
  }
  cvRemoveFile(ev: Event): void {
    ev.stopPropagation();
    this.cvSelectedFile = null;
    this.cvScanComplete = false;
    this.cdr.markForCheck();
  }
  private cvHandleFile(file: File): void {
    const allowed = ['.pdf', '.doc', '.docx'];
    if (!allowed.some(ext => file.name.toLowerCase().endsWith(ext))) {
      alert('Dozwolone są tylko pliki PDF, DOC, DOCX!');
      return;
    }
    this.cvSelectedFile = file;
    this.cvAnalyze(file);
  }
  private cvAnalyze(file: File): void {
    this.cvIsScanning = true; this.cvScanProgress = 0; this.cvScanStatus = 'Analiza CV...';
    setTimeout(() => { this.cvScanProgress = 35; this.cdr.markForCheck(); }, 200);

    this.cvApi.uploadCv(file).subscribe({
      next: (techs) => {
        this.cvScanProgress = 100; this.cvScanStatus = 'Zakończono!';
        const selectedTechnologies = techs.map(t => ({ id: t.id, name: t.name }));
        setTimeout(() => {
          this.cvIsScanning = false;
          this.cvScanComplete = true;
          this.selectedTechnologies = selectedTechnologies;
          this.filtersChange.emit(this.computeValue());
          setTimeout(() => this.applyFilters(), 50);
          this.cdr.markForCheck();
        }, 150);
      },
      error: () => {
        this.cvScanProgress = 100; this.cvScanStatus = 'Zakończono!';
        setTimeout(() => {
          this.cvIsScanning = false;
          this.cvScanComplete = true;
          this.cdr.markForCheck();
        }, 150);
      },
    });
  }
}
