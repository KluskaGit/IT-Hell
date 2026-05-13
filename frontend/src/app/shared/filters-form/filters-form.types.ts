import { LocationItem } from '../location-picker/location-picker.component';

export type ContractType = 'uop' | 'b2b' | 'uz';

export const SALARY_OPTIONS: readonly number[] = [
  0, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
  13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 22000,
  25000, 30000, 35000, 40000, 45000, 50000,
] as const;

export const MAX_SALARY_INDEX = SALARY_OPTIONS.length - 1;
export const MAX_SALARY = SALARY_OPTIONS[MAX_SALARY_INDEX];

export interface FiltersValue {
  itArea: Record<string, boolean>;
  technologies: Record<string, boolean>;
  jobSites: Record<string, boolean>;
  workMode: Record<string, boolean>;
  seniority: Record<string, boolean>;
  salaryFromIndex: number;
  salaryToIndex: number;
  selectedLocations: LocationItem[];
  selectedTechnologies: LocationItem[];
  specializationIds: string[];
  technologyIds: string[];
  expLevelIds: string[];
  workTypeIds: string[];
  siteIds: string[];
  locationIds: string[];
  salaryFrom: number;
  salaryTo: number;
}

export interface FiltersInitialState {
  itArea?: Record<string, boolean>;
  technologies?: Record<string, boolean>;
  jobSites?: Record<string, boolean>;
  workMode?: Record<string, boolean>;
  seniority?: Record<string, boolean>;
  salaryFromIndex?: number;
  salaryToIndex?: number;
  selectedLocations?: LocationItem[];
  selectedTechnologies?: LocationItem[];
  locationIds?: string[];
  workModeIds?: string[];
  jobSiteKeys?: string[];
}
