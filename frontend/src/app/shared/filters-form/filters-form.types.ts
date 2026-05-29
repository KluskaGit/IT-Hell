// Typy i stałe współdzielone przez FiltersFormComponent i strony które go używają (home, offers, profile).
import { LocationItem } from '../location-picker/location-picker.component';

// Klucz localStorage pod którym zapisywany jest stan formularza filtrów.
// Współdzielony przez home, offers i profile - zmiana na jednej stronie widoczna po nawigacji
export const FILTERS_STORAGE_KEY = 'cv_analizer_candidate_filters';

export type ContractType = 'uop' | 'b2b' | 'uz';

// Pełny stan formularza emitowany przez (filtersChange) i (ready).
// Zawiera dane w dwóch formatach: surowe obiekty boolean (do badge'y dopasowania w ofertach)
// i przetworzone tablice ID (*Ids) gotowe jako parametry HTTP do backendu.
export interface FiltersValue {
  // Surowe obiekty boolean ze stanu FormGroup - { id: true/false, ... }
  // Używane przez offers.component.ts do obliczania matchedRoles i matchedTech w kartach ofert
  itArea:       Record<string, boolean>;
  technologies: Record<string, boolean>;
  jobSites:     Record<string, boolean>;
  workMode:     Record<string, boolean>;
  seniority:    Record<string, boolean>;

  // Indeksy w tablicy SALARY_OPTIONS (nie kwoty PLN) - krótsze do URL i localStorage
  salaryFromIndex: number;
  salaryToIndex:   number;

  // Pełne obiekty LocationItem - potrzebne do odtworzenia stanu pickera po nawigacji
  selectedLocations:    LocationItem[];
  selectedTechnologies: LocationItem[];

  // Tablice ID gotowe jako parametry HTTP do GET /v1/job-offers/get_offer_filter.
  // Puste tablice oznaczają brak filtra - backend zwraca wyniki dla wszystkich wartości
  specializationIds: string[];
  technologyIds:     string[];
  expLevelIds:       string[];
  workTypeIds:       string[];
  siteIds:           string[];
  locationIds:       string[];

  // Kwoty PLN przeliczone z indeksów przez SALARY_OPTIONS[index]
  salaryFrom: number;
  salaryTo:   number;
}

// Częściowy stan przekazywany do FiltersFormComponent przez @Input() initialFilters.
// Obsługuje dwa formaty niektórych pól (backward compat):
//   - stary: jobSites = { klucz: true/false } (obiekt boolean z FormGroup)
//   - nowy:  jobSiteKeys = ['pracuj', 'nofluff'] (tablica kluczy - krótszy do URL i localStorage)
export interface FiltersInitialState {
  // Stary format obiektów boolean wprost z FormGroup
  itArea?:       Record<string, boolean>;
  technologies?: Record<string, boolean>; // stary format (nowy: selectedTechnologies)
  jobSites?:     Record<string, boolean>; // stary format (nowy: jobSiteKeys)
  workMode?:     Record<string, boolean>; // stary format (nowy: workModeIds)
  seniority?:    Record<string, boolean>;

  salaryFromIndex?: number;
  salaryToIndex?:   number;

  // Pełne obiekty do bezpośredniego ustawienia stanu pickera
  selectedLocations?:    LocationItem[];
  selectedTechnologies?: LocationItem[]; // nowy format (stary: technologies)

  // Nowe formaty tablicowe - prostsze do serializacji w URL i history.state
  locationIds?:  string[];
  workModeIds?:  string[]; // zastępuje workMode gdy przekazywane z URL
  jobSiteKeys?:  string[]; // zastępuje jobSites gdy przekazywane z URL/state
}
