// Types and constants shared by FiltersFormComponent and the pages that use it (home, offers, profile).
import { LocationItem } from '../location-picker/location-picker.component';

// localStorage key under which the filter form state is saved.
// Shared by home, offers and profile - a change on one page is visible after navigation
export const FILTERS_STORAGE_KEY = 'cv_analizer_candidate_filters';

export type ContractType = 'uop' | 'b2b' | 'uz';

// The full form state emitted by (filtersChange) and (ready).
// Holds data in two formats: raw boolean objects (for the match badges in offers)
// and processed ID arrays (*Ids) ready to be used as HTTP params for the backend.
export interface FiltersValue {
  // Raw boolean objects from the FormGroup state - { id: true/false, ... }
  // Used by offers.component.ts to compute matchedRoles and matchedTech in offer cards
  itArea:       Record<string, boolean>;
  technologies: Record<string, boolean>;
  jobSites:     Record<string, boolean>;
  workMode:     Record<string, boolean>;
  seniority:    Record<string, boolean>;

  // Indexes into the SALARY_OPTIONS array (not PLN amounts) - shorter for the URL and localStorage
  salaryFromIndex: number;
  salaryToIndex:   number;

  // Full LocationItem objects - needed to restore the picker state after navigation
  selectedLocations:    LocationItem[];
  selectedTechnologies: LocationItem[];

  // ID arrays ready to be used as HTTP params for GET /v1/job-offers/get_offer_filter.
  // Empty arrays mean no filter - the backend returns results for all values
  specializationIds: string[];
  technologyIds:     string[];
  expLevelIds:       string[];
  workTypeIds:       string[];
  siteIds:           string[];
  locationIds:       string[];

  // PLN amounts resolved from the indexes via SALARY_OPTIONS[index]
  salaryFrom: number;
  salaryTo:   number;
}

// Partial state passed to FiltersFormComponent via @Input() initialFilters.
// Supports two formats for some fields (backward compat):
//   - old: jobSites = { key: true/false } (boolean object from the FormGroup)
//   - new: jobSiteKeys = ['pracuj', 'nofluff'] (array of keys - shorter for the URL and localStorage)
export interface FiltersInitialState {
  // Old format: boolean objects straight from the FormGroup
  itArea?:       Record<string, boolean>;
  technologies?: Record<string, boolean>; // old format (new: selectedTechnologies)
  jobSites?:     Record<string, boolean>; // old format (new: jobSiteKeys)
  workMode?:     Record<string, boolean>; // old format (new: workModeIds)
  seniority?:    Record<string, boolean>;

  salaryFromIndex?: number;
  salaryToIndex?:   number;

  // Full objects to set the picker state directly
  selectedLocations?:    LocationItem[];
  selectedTechnologies?: LocationItem[]; // new format (old: technologies)

  // New array formats - simpler to serialize in the URL and history.state
  locationIds?:  string[];
  workModeIds?:  string[]; // replaces workMode when passed from the URL
  jobSiteKeys?:  string[]; // replaces jobSites when passed from the URL/state
}
