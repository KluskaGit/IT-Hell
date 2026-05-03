import { LocationItem } from '../location-picker/location-picker.component';

export type ContractType = 'uop' | 'b2b' | 'uz';

export interface FiltersValue {
  itArea: Record<string, boolean>;
  technologies: Record<string, boolean>;
  jobSites: Record<string, boolean>;
  workMode: Record<string, boolean>;
  seniority: string;
  salaryFromIndex: number;
  salaryToIndex: number;
  selectedLocations: LocationItem[];
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
  seniority?: string;
  salaryFromIndex?: number;
  salaryToIndex?: number;
  selectedLocations?: LocationItem[];
}
