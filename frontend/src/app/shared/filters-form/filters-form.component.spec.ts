import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  FiltersFormComponent,
  MAX_SALARY_INDEX,
  SALARY_OPTIONS,
} from './filters-form.component';
import { LookupsApiService } from '../../core/services/lookups-api.service';
import { FiltersInitialState } from './filters-form.types';

describe('FiltersFormComponent', () => {
  let fixture: ComponentFixture<FiltersFormComponent>;
  let component: FiltersFormComponent;

  const lookupsApiMock = {
    getTechnologies: vi.fn(),
    getSpecializations: vi.fn(),
    getLocations: vi.fn(),
    getSites: vi.fn(),
    getExperienceLevels: vi.fn(),
    getWorkTypes: vi.fn(),
  };

  const mockTechs = [
    { id: 'tech-1', name: 'Angular' },
    { id: 'tech-2', name: 'TypeScript' },
  ];

  const mockRoles = [
    { id: 'role-1', name: 'Frontend' },
    { id: 'role-2', name: 'Backend' },
  ];

  const mockLocations = [
    { id: 'loc-1', name: 'Warszawa' },
    { id: 'loc-2', name: 'Kraków' },
  ];

  const mockSites = [
    { id: 'site-1', name: 'Pracuj.pl' },
    { id: 'site-2', name: 'No Fluff Jobs' },
  ];

  const mockExpLevels = [
    { id: 'exp-1', name: 'Junior' },
    { id: 'exp-2', name: 'Mid' },
  ];

  const mockWorkTypes = [
    { id: 'wt-1', name: 'Remote' },
    { id: 'wt-2', name: 'Hybrid' },
  ];

  beforeEach(async () => {
    lookupsApiMock.getTechnologies.mockReturnValue(of(mockTechs));
    lookupsApiMock.getSpecializations.mockReturnValue(of(mockRoles));
    lookupsApiMock.getLocations.mockReturnValue(of(mockLocations));
    lookupsApiMock.getSites.mockReturnValue(of(mockSites));
    lookupsApiMock.getExperienceLevels.mockReturnValue(of(mockExpLevels));
    lookupsApiMock.getWorkTypes.mockReturnValue(of(mockWorkTypes));

    await TestBed.configureTestingModule({
      imports: [FiltersFormComponent],
      providers: [
        { provide: LookupsApiService, useValue: lookupsApiMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FiltersFormComponent);
    component = fixture.componentInstance;
  });

  async function initComponent() {
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
    fixture.detectChanges();
  }

  it('should create', async () => {
    await initComponent();
    expect(component).toBeTruthy();
    expect(component.filtersForm).toBeTruthy();
    expect(component.isLoading).toBe(false);
  });

  it('should load lookups and emit ready + filtersChange on init', async () => {
    const readySpy = vi.spyOn(component.ready, 'emit');
    const filtersChangeSpy = vi.spyOn(component.filtersChange, 'emit');

    await initComponent();

    expect(component.availableTechs).toHaveLength(2);
    expect(component.availableRoles).toHaveLength(2);
    expect(component.availableLocations).toHaveLength(2);
    expect(component.availableSites).toHaveLength(2);
    expect(component.availableExpLevels).toHaveLength(2);
    expect(component.availableWorkTypes).toHaveLength(2);

    expect(readySpy).toHaveBeenCalledTimes(1);
    expect(filtersChangeSpy).toHaveBeenCalled();
  });

  it('should build computeValue with selected technologies and locations', async () => {
    await initComponent();

    component.selectedTechnologies = [{ id: 'tech-1', name: 'Angular' }];
    component.selectedLocations = [{ id: 'loc-2', name: 'Kraków' }];

    component.filtersForm?.get('itArea.role-1')?.setValue(true);
    component.filtersForm?.get('seniority.exp-2')?.setValue(true);
    component.filtersForm?.get('workMode.wt-1')?.setValue(true);
    component.filtersForm?.get('jobSites.site-1')?.setValue(true);
    component.filtersForm?.get('salaryFromIndex')?.setValue(3);
    component.filtersForm?.get('salaryToIndex')?.setValue(10);

    const value = component.computeValue();

    expect(value.specializationIds).toEqual(['role-1']);
    expect(value.technologyIds).toEqual(['tech-1']);
    expect(value.expLevelIds).toEqual(['exp-2']);
    expect(value.workTypeIds).toEqual(['wt-1']);
    expect(value.siteIds).toEqual(['site-1']);
    expect(value.locationIds).toEqual(['loc-2']);
    expect(value.salaryFromIndex).toBe(3);
    expect(value.salaryToIndex).toBe(10);
    expect(value.salaryFrom).toBe(SALARY_OPTIONS[3]);
    expect(value.salaryTo).toBe(SALARY_OPTIONS[10]);
  });

  it('should return empty siteIds and workTypeIds when all options are selected', async () => {
    await initComponent();

    component.filtersForm?.get('workMode.wt-1')?.setValue(true);
    component.filtersForm?.get('workMode.wt-2')?.setValue(true);
    component.filtersForm?.get('jobSites.site-1')?.setValue(true);
    component.filtersForm?.get('jobSites.site-2')?.setValue(true);

    const value = component.computeValue();

    expect(value.workTypeIds).toEqual([]);
    expect(value.siteIds).toEqual([]);
  });

  it('should patch technologies and seniority from initial filters', async () => {
    await initComponent();

    const filtersChangeSpy = vi.spyOn(component.filtersChange, 'emit');

    const nextFilters: FiltersInitialState = {
      selectedTechnologies: [{ id: 'tech-2', name: 'TypeScript' }],
      seniority: { 'exp-1': true },
      salaryFromIndex: 2,
      salaryToIndex: 8,
    };

    component.patchValue(nextFilters);

    expect(component.selectedTechnologies).toEqual([
      { id: 'tech-2', name: 'TypeScript' },
    ]);
    expect(component.filtersForm?.get('seniority.exp-1')?.value).toBe(true);
    expect(component.filtersForm?.get('salaryFromIndex')?.value).toBe(2);
    expect(component.filtersForm?.get('salaryToIndex')?.value).toBe(8);
    expect(filtersChangeSpy).toHaveBeenCalled();
  });

  it('should keep salary range valid when from is greater than or equal to to', async () => {
    await initComponent();

    component.filtersForm?.get('salaryFromIndex')?.setValue(10);
    component.filtersForm?.get('salaryToIndex')?.setValue(10);

    component.checkSalaryRange('from');

    expect(component.filtersForm?.get('salaryFromIndex')?.value).toBe(9);
  });

  it('should keep salary range valid when to is lower than or equal to from', async () => {
    await initComponent();

    component.filtersForm?.get('salaryFromIndex')?.setValue(7);
    component.filtersForm?.get('salaryToIndex')?.setValue(6);

    component.checkSalaryRange('to');

    expect(component.filtersForm?.get('salaryToIndex')?.value).toBe(8);
  });

  it('should select only one experience level in singleExpLevelSelection mode', async () => {
    component.singleExpLevelSelection = true;
    await initComponent();

    const filtersChangeSpy = vi.spyOn(component.filtersChange, 'emit');

    component.onSingleExpLevelSelect('exp-2');

    expect(component.filtersForm?.get('seniority.exp-1')?.value).toBe(false);
    expect(component.filtersForm?.get('seniority.exp-2')?.value).toBe(true);
    expect(filtersChangeSpy).toHaveBeenCalled();
  });

  it('should emit applyClicked on applyFilters', async () => {
    await initComponent();

    const applySpy = vi.spyOn(component.applyClicked, 'emit');

    component.applyFilters();

    expect(applySpy).toHaveBeenCalledTimes(1);
  });

  it('should emit profileFillClicked when onProfileFillClick is called', async () => {
    await initComponent();

    const profileFillSpy = vi.spyOn(component.profileFillClicked, 'emit');

    component.onProfileFillClick();

    expect(profileFillSpy).toHaveBeenCalledTimes(1);
  });

  it('should toggle collapsed state', async () => {
    await initComponent();

    expect(component.collapsed).toBe(false);

    component.toggleCollapsed();
    expect(component.collapsed).toBe(true);

    component.toggleCollapsed();
    expect(component.collapsed).toBe(false);
  });

  it('should expose salary helpers correctly', async () => {
    await initComponent();

    component.filtersForm?.get('salaryFromIndex')?.setValue(2);
    component.filtersForm?.get('salaryToIndex')?.setValue(MAX_SALARY_INDEX);

    expect(component.salaryFromValue).toBe(SALARY_OPTIONS[2]);
    expect(component.salaryToValue).toBe(SALARY_OPTIONS[MAX_SALARY_INDEX]);
    expect(component.getSalaryProgressLeft()).toBe((2 / MAX_SALARY_INDEX) * 100);
  });
});