// Typy i stałe współdzielone przez FiltersFormComponent i wszystkie strony które go używają:
// home.component.ts, offers.component.ts, profile.component.ts.
// LocationItem importowany z location-picker bo lokalizacje i technologie używają tego samego interfejsu {id, name}
import { LocationItem } from '../location-picker/location-picker.component';

// Klucz localStorage pod którym zapisywany jest stan formularza filtrów.
// Współdzielony przez home, offers i profile - zmiana filtrów na jednej stronie
// jest widoczna na pozostałych po odświeżeniu lub nawigacji
export const FILTERS_STORAGE_KEY = 'cv_analizer_candidate_filters';

// Typ kontraktu - używany wewnętrznie, aktualnie nie podpięty do filtrów API
export type ContractType = 'uop' | 'b2b' | 'uz';

// FiltersValue - PEŁNY stan formularza filtrów po jego inicjalizacji.
// Zwracany przez FiltersFormComponent.computeValue() i emitowany przez (filtersChange) i (ready).
// Zawiera dane w DWÓCH formatach:
//   - surowe obiekty boolean (itArea, technologies...) - do badge'y dopasowania w kartach ofert
//   - przetworzone tablice ID (*Ids) - gotowe do wysłania jako parametry HTTP do backendu
export interface FiltersValue {
  // Surowe obiekty boolean ze stanu FormGroup - { id_roli: true/false, ... }
  // Używane przez offers.component.ts do obliczania matchedRoles i matchedTech w kartach ofert
  itArea:       Record<string, boolean>; // zaznaczone specjalizacje (role IT)
  technologies: Record<string, boolean>; // zaznaczone technologie
  jobSites:     Record<string, boolean>; // zaznaczone portale ogłoszeń
  workMode:     Record<string, boolean>; // zaznaczone tryby pracy
  seniority:    Record<string, boolean>; // zaznaczone poziomy doświadczenia

  // Indeksy w tablicy SALARY_OPTIONS (z filters-form.component.ts) - nie kwoty PLN.
  // Serializowane do URL (?salFrom=3&salTo=12) i localStorage zamiast kwot bo są krótsze
  salaryFromIndex: number;
  salaryToIndex:   number;

  // Pełne obiekty LocationItem - potrzebne do odtworzenia stanu pickera po nawigacji.
  // Przechowują {id, name} żeby picker mógł wyświetlić nazwę bez ponownego szukania po ID
  selectedLocations:    LocationItem[];
  selectedTechnologies: LocationItem[];

  // Tablice ID gotowe jako parametry HTTP do GET /v1/job-offers/get_offer_filter.
  // Puste tablice oznaczają "brak filtra" - backend zwraca wyniki dla wszystkich wartości.
  // Szczegółowa logika "kiedy puste" opisana w FiltersFormComponent.computeValue()
  specializationIds: string[]; // ID zaznaczonych specjalizacji (z itArea gdzie true)
  technologyIds:     string[]; // ID zaznaczonych technologii (z selectedTechnologies)
  expLevelIds:       string[]; // ID zaznaczonych poziomów doświadczenia (z seniority gdzie true)
  workTypeIds:       string[]; // ID zaznaczonych trybów pracy (puste gdy wszystkie/żadne zaznaczone)
  siteIds:           string[]; // ID zaznaczonych portali (puste gdy wszystkie/żadne zaznaczone)
  locationIds:       string[]; // ID zaznaczonych lokalizacji (z selectedLocations)

  // Kwoty PLN przeliczone z indeksów suwaka przez SALARY_OPTIONS[index].
  // Używane przez offers.component.ts jako salary_from_min i salary_to_max w parametrach API
  salaryFrom: number; // SALARY_OPTIONS[salaryFromIndex]
  salaryTo:   number; // SALARY_OPTIONS[salaryToIndex]
}

// FiltersInitialState - CZĘŚCIOWY stan przekazywany do FormGroup przy inicjalizacji.
// Wszystkie pola są opcjonalne (?) - nie trzeba podawać wszystkich naraz.
// Używany przez home, offers i profile jako @Input() initialFilters dla FiltersFormComponent.
// Istnieją dwa formaty niektórych pól (stary i nowy) - FiltersFormComponent obsługuje oba:
//   - stary: jobSites = { klucz: true/false } (bezpośredni obiekt boolean z FormGroup)
//   - nowy:  jobSiteKeys = ['pracuj', 'nofluff'] (tablica wybranych kluczy - krótszy do URL i localStorage)
export interface FiltersInitialState {
  // Stary format - obiekty boolean wprost z FormGroup (np. z localStorage starszego formatu)
  itArea?:       Record<string, boolean>;
  technologies?: Record<string, boolean>; // stary format dla technologii (nowy: selectedTechnologies)
  jobSites?:     Record<string, boolean>; // stary format dla portali (nowy: jobSiteKeys)
  workMode?:     Record<string, boolean>; // stary format dla trybu pracy (nowy: workModeIds)
  seniority?:    Record<string, boolean>;

  // Indeksy suwaka salary (te same co w FiltersValue - kompatybilne między oboma interfejsami)
  salaryFromIndex?: number;
  salaryToIndex?:   number;

  // Pełne obiekty LocationItem do bezpośredniego ustawienia stanu pickera
  selectedLocations?:    LocationItem[];
  selectedTechnologies?: LocationItem[]; // nowy format dla technologii (stary: technologies)

  // Nowe formaty tablicowe - prostsze do serializacji w URL i history.state
  locationIds?:  string[]; // ID lokalizacji (gdy brak selectedLocations)
  workModeIds?:  string[]; // ID trybów pracy (zastępuje workMode gdy przekazywane z URL)
  jobSiteKeys?:  string[]; // klucze portali (zastępuje jobSites gdy przekazywane z URL/state)
}
