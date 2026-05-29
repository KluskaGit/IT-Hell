// Komponent formularza filtrów - używany na stronie /offers (sidebar) i /home (główny formularz).
// Pobiera dane słownikowe (role, technologie, lokalizacje itp.) z backendu przez LookupsApiService,
// buduje dynamiczny ReactiveForm i emituje FiltersValue przy każdej zmianie.
// Typy wejścia/wyjścia zdefiniowane są w filters-form.types.ts (w tym samym folderze).
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { forkJoin, of, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// LocationPickerComponent (shared/location-picker) - picker lokalizacji z autocomplete
import { LocationItem, LocationPickerComponent } from '../location-picker/location-picker.component';
// TechPickerComponent (shared/tech-picker) - picker technologii z wyszukiwarką i tagami
import { TechPickerComponent } from '../tech-picker/tech-picker.component';
// LookupsApiService - pobiera dane słownikowe z GET /v1/lookups/* (role, tech, lokalizacje itd.)
import { LookupsApiService } from '../../core/services/lookups-api.service';
// FiltersInitialState - częściowy stan przekazywany do formularza przy inicjalizacji (np. z localStorage)
// FiltersValue - pełny stan formularza gotowy do wysłania jako parametry do API ofert
import { FiltersInitialState, FiltersValue } from './filters-form.types';

// Wewnętrzny typ dla elementów list wyboru (role, technologie, portale, poziomy doświadczenia).
// key - identyfikator używany w checkboxach FormGroup
// label - czytelna nazwa wyświetlana użytkownikowi
// id - identyfikator backendowy (może być tym samym co key lub UUID)
type LookupItem = { key: string; label: string; id: string };

// Predefiniowane wartości suwaka wynagrodzenia w złotówkach (nieregularny krok - gęściej na niskich kwotach).
// Indeks w tej tablicy jest przechowywany w FormGroup (salaryFromIndex, salaryToIndex),
// a rzeczywista kwota PLN jest odczytywana przez salaryOptions[index].
// Eksportowane żeby parent komponenty (home, offers) znały zakres suwaka.
export const SALARY_OPTIONS = [
  0, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
  13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 22000,
  25000, 30000, 35000, 40000, 45000, 50000,
];
// Maksymalny indeks suwaka = indeks ostatniego elementu SALARY_OPTIONS (50 000 PLN).
// Eksportowane i używane w offers.component.ts do sprawdzania czy filtr salary jest domyślny
export const MAX_SALARY_INDEX = SALARY_OPTIONS.length - 1;

@Component({
  selector: 'app-filters-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LocationPickerComponent, TechPickerComponent],
  templateUrl: './filters-form.component.html',
  styleUrls: ['./filters-form.component.css'],
})
export class FiltersFormComponent implements OnInit, OnChanges, OnDestroy {
  // Subject do anulowania subskrypcji RxJS przy zniszczeniu komponentu (wzorzec takeUntil)
  private readonly destroy$ = new Subject<void>();
  // FormBuilder - tworzy FormGroup i FormControl bez ręcznego new FormControl()
  private readonly fb = inject(FormBuilder);
  // LookupsApiService - pobiera dane słownikowe z backendu (role, tech, lokalizacje, portale, poziomy)
  private readonly lookupsApi = inject(LookupsApiService);
  // ChangeDetectorRef - ręczne wymuszenie odświeżenia widoku po asynchronicznych operacjach
  private readonly cdr = inject(ChangeDetectorRef);

  // Stan początkowy formularza przekazywany przez komponent nadrzędny (home, offers, profile).
  // Typ FiltersInitialState to częściowy obiekt - nie wszystkie pola muszą być podane.
  // null = brak zapisanego stanu, formularz zaczyna od wartości domyślnych
  @Input() initialFilters: FiltersInitialState | null = null;
  // Czy sekcje formularza mogą być zwijane/rozwijane przez użytkownika
  @Input() collapsible = false;
  // Czy pokazywać przycisk "Szukaj ofert" na dole formularza (false w sidebar offers)
  @Input() showApplyButton = true;
  @Input() applyButtonLabel = 'Szukaj ofert';
  // Tytuł nagłówka formularza (gdy showSummaryHeader = true)
  @Input() summaryHeading = 'Filtry';
  // Czy pokazywać nagłówek z tytułem formularza (false w sidebar offers - brak miejsca)
  @Input() showSummaryHeader = false;
  // Czy formularz powinien zaczynać jako zwinięty (collapsible musi być true)
  @Input() initialCollapsed = false;

  // Flagi widoczności poszczególnych sekcji formularza.
  // Pozwalają na użycie tego samego komponentu w różnych kontekstach
  // (np. profile może nie pokazywać sekcji "Portale" albo "Salary")
  @Input() showLocation = true;
  @Input() showExpLevel = true;
  @Input() showWorkMode = true;
  @Input() showSalary = true;
  @Input() showRoles = true;
  @Input() showTechnologies = true;
  @Input() showSites = true;
  // Gdy true, tylko jeden poziom doświadczenia może być wybrany naraz (radio zamiast checkbox).
  // Używane w profile.component gdzie wybieramy jeden poziom seniority
  @Input() singleExpLevelSelection = false;
  // Przycisk "Uzupełnij z profilu" - widoczny tylko gdy użytkownik jest zalogowany.
  // Wartość przekazywana z parent komponentu (offers, home) przez isAuthenticated()
  @Input() showProfileFillButton = false;
  @Input() profileFillButtonLabel = 'Uzupełnij z profilu';
  // Pozycja przycisku "Uzupełnij z profilu" w szablonie
  @Input() profileFillButtonPosition: 'top' | 'above-technologies' | 'header-right' = 'top';

  // Emitowane gdy użytkownik kliknie przycisk "Uzupełnij z profilu"
  // - parent komponent (offers, home) obsługuje pobranie danych z API
  @Output() profileFillClicked = new EventEmitter<void>();
  // Emitowane przy każdej zmianie jakiegokolwiek filtra (checkbox, suwak, lokalizacja, technologia)
  @Output() filtersChange = new EventEmitter<FiltersValue>();
  // Emitowane gdy użytkownik kliknie przycisk "Szukaj ofert" (showApplyButton = true)
  @Output() applyClicked = new EventEmitter<FiltersValue>();
  // Emitowane RAZ po zakończeniu inicjalizacji formularza i pobraniu danych z backendu.
  // Parent komponent (offers) czeka na to zdarzenie przed pierwszym ładowaniem ofert
  @Output() ready = new EventEmitter<FiltersValue>();

  // Eksponujemy SALARY_OPTIONS i MAX_SALARY_INDEX przez pola readonly żeby były dostępne w szablonie HTML
  readonly salaryOptions = SALARY_OPTIONS;
  readonly maxSalaryIndex = MAX_SALARY_INDEX;

  // Listy dostępnych opcji pobrane z backendu przez LookupsApiService w ngOnInit.
  // Wszystkie są puste [] przed zakończeniem forkJoin
  availableRoles: LookupItem[] = [];       // specjalizacje z GET /v1/lookups/specializations
  availableTechs: LookupItem[] = [];       // technologie z GET /v1/lookups/technologies (jako LookupItem)
  availableTechItems: LocationItem[] = []; // te same technologie ale w formacie {id, name} dla TechPicker
  availableSites: LookupItem[] = [];       // portale ogłoszeń z GET /v1/lookups/sites
  availableExpLevels: LookupItem[] = [];   // poziomy doświadczenia z GET /v1/lookups/experience-levels
  availableWorkTypes: LookupItem[] = [];   // tryby pracy z GET /v1/lookups/work-types
  availableLocations: LocationItem[] = []; // lokalizacje z GET /v1/lookups/locations (dla LocationPicker)

  // Aktualnie wybrane lokalizacje i technologie - przechowywane POZA FormGroup
  // bo LocationPicker i TechPicker mają własne @Input/Output i nie są kontrolkami ReactiveForm
  selectedLocations: LocationItem[] = [];
  selectedTechnologies: LocationItem[] = [];

  // filtersForm jest null dopóki forkJoin nie zakończy pobierania danych z backendu.
  // FormGroup jest budowany dynamicznie bo kontrolki checkboxów zależą od danych z API
  filtersForm: FormGroup | null = null;
  // Flaga ładowania - true podczas pobierania danych z backendu, false po zakończeniu forkJoin
  isLoading = true;
  // Komunikat błędu gdy request do backendu się nie powiódł (null = brak błędu)
  loadError: string | null = null;
  // Stan zwinięcia formularza - zmieniana przez toggleCollapsed() gdy collapsible = true
  collapsed = false;
  // Flaga "pokaż wszystkie role" - domyślnie pokazujemy tylko 8 pierwszych ról
  showAllRoles = false;
  // Flaga gotowości TechPickerComponent - używana do dwuetapowego renderowania (patrz queueMicrotask)
  techPickerReady = false;

  // Przekazuje kliknięcie przycisku "Uzupełnij z profilu" do parent komponentu przez @Output
  onProfileFillClick(): void {
    this.profileFillClicked.emit();
  }

  ngOnInit(): void {
    // Ustawiamy stan zwinięcia na podstawie @Input - collapsed tylko gdy collapsible jest włączone
    this.collapsed = this.collapsible && this.initialCollapsed;

    // forkJoin wysyła WSZYSTKIE requesty równolegle i czeka aż WSZYSTKIE się zakończą.
    // Dzięki temu nie budujemy formularza z niepełnymi danymi.
    // of([]) jako fallback gdy dana sekcja formularza jest ukryta przez @Input (np. showRoles = false)
    forkJoin({
      techs:     this.showTechnologies ? this.lookupsApi.getTechnologies()      : of([]),
      specs:     this.showRoles        ? this.lookupsApi.getSpecializations()    : of([]),
      locations: this.showLocation     ? this.lookupsApi.getLocations()          : of([]),
      sites:     this.showSites        ? this.lookupsApi.getSites()              : of([]),
      expLevels: this.showExpLevel     ? this.lookupsApi.getExperienceLevels()   : of([]),
      workTypes: this.showWorkMode     ? this.lookupsApi.getWorkTypes()          : of([]),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ techs, specs, locations, sites, expLevels, workTypes }) => {
        // dedupeByKey usuwa duplikaty które czasem przychodzą z backendu (ten sam ID kilka razy)
        this.availableTechs = this.dedupeByKey(
          techs.map(t => ({ key: t.id, label: t.name, id: t.id }))
        );
        // availableTechItems to ta sama lista w formacie LocationItem = {id, name}
        // potrzebnym przez TechPickerComponent (który używa wspólnego interfejsu z LocationPicker)
        this.availableTechItems = this.availableTechs.map(t => ({ id: t.id, name: t.label }));

        this.availableRoles = this.dedupeByKey(
          specs.map(s => ({ key: s.id, label: s.name, id: s.id }))
        );

        this.availableSites     = sites.map(s => ({ key: s.id, label: s.name, id: s.id }));
        this.availableExpLevels = expLevels.map(e => ({ key: e.id, label: e.name, id: e.id }));
        this.availableWorkTypes = workTypes.map(w => ({ key: w.id, label: w.name, id: w.id }));

        // Lokalizacje sortujemy alfabetycznie po polsku dla wygody autocomplete
        this.availableLocations = locations
          .map(l => ({ id: l.id, name: l.name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

        // Odtwarzamy poprzednio wybrane lokalizacje i technologie z initialFilters
        this.selectedLocations    = this.restoreSelectedLocations(this.initialFilters ?? {});
        this.selectedTechnologies = [...this.restoreSelectedTechs(this.initialFilters ?? {})];

        // Budujemy FormGroup dopiero po pobraniu danych (kontrolki checkboxów zależą od availableRoles itp.)
        this.filtersForm = this.buildForm();
        this.subscribeFormChanges();
        this.isLoading = false;

        // Dwuetapowy render TechPickerComponent - najpierw chowamy (false), wykrywamy zmiany,
        // potem w queueMicrotask pokazujemy z już poprawnie ustawionym selectedTechnologies.
        // Bez tego TechPicker renderuje się zanim selectedTechnologies jest gotowe i nie pokazuje tagów.
        this.techPickerReady = false;
        this.cdr.detectChanges();

        // queueMicrotask uruchamia callback po zakończeniu bieżącego cyklu Angular change detection,
        // ale przed następną ramką renderowania - bezpieczne miejsce na emit ready i show TechPicker
        queueMicrotask(() => {
          this.techPickerReady = true;
          this.cdr.detectChanges();

          // Emitujemy ready i filtersChange żeby parent komponent (offers) mógł załadować oferty
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

  // Odtwarza listę wybranych lokalizacji z initialFilters.
  // Priorytety: selectedLocations (obiekty) > locationIds (tablica ID do wyszukania w availableLocations)
  private restoreSelectedLocations(init: FiltersInitialState): LocationItem[] {
    if (init.selectedLocations?.length) return init.selectedLocations;
    if (init.locationIds?.length) {
      return this.availableLocations.filter(l => init.locationIds!.includes(l.id));
    }
    return [];
  }

  // Odtwarza listę wybranych technologii z initialFilters.
  // Priorytety: selectedTechnologies (obiekty) > technologies (stary format Record<id, boolean>)
  // Stary format był używany przed wprowadzeniem selectedTechnologies - zachowany dla kompatybilności
  private restoreSelectedTechs(init: FiltersInitialState): LocationItem[] {
    if (init.selectedTechnologies?.length) return init.selectedTechnologies;
    // backward compat: restore from old Record<string, boolean> format
    if (init.technologies) {
      return this.availableTechItems.filter(t => init.technologies![t.id]);
    }
    return [];
  }

  // Usuwa duplikaty z listy LookupItem na podstawie pola key.
  // Potrzebne bo backend czasem zwraca ten sam rekord kilka razy (np. portale ogłoszeń)
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

  // Buduje wartości początkowe dla FormGroup na podstawie initialFilters i dostępnych opcji z backendu.
  // Zwraca obiekty Record<id, boolean> dla checkboxów (itArea, jobSites, seniority, workMode)
  // oraz indeksy suwaka salary (salaryFromIndex, salaryToIndex).
  // Obsługuje dwa formaty danych wejściowych:
  //   - stary: jobSites = { klucz: true/false } - bezpośredni obiekt boolean
  //   - nowy:  jobSiteKeys = ['pracuj', 'nofluff'] - tablica wybranych kluczy
  private buildFilterValues(init: FiltersInitialState): {
    itArea: Record<string, boolean>;
    jobSites: Record<string, boolean>;
    seniority: Record<string, boolean>;
    workMode: Record<string, boolean>;
    salaryFromIndex: number;
    salaryToIndex: number;
  } {
    // Dla każdej dostępnej roli ustawiamy true/false na podstawie initialFilters.
    // ?? false zapewnia wartość domyślną false gdy dana rola nie jest w initialFilters
    const itArea: Record<string, boolean> = {};
    for (const r of this.availableRoles) itArea[r.id] = init.itArea?.[r.id] ?? false;

    // jobSiteKeys (nowy format tablicowy) ma pierwszeństwo przed jobSites (stary format obiektowy)
    const jobSites: Record<string, boolean> = {};
    const jobSiteKeys = init.jobSiteKeys;
    for (const s of this.availableSites) {
      jobSites[s.key] = jobSiteKeys !== undefined
        ? jobSiteKeys.includes(s.key)
        : (init.jobSites?.[s.key] ?? false);
    }

    const seniority: Record<string, boolean> = {};
    for (const e of this.availableExpLevels) seniority[e.id] = init.seniority?.[e.id] ?? false;

    // workModeIds (nowy format tablicowy) ma pierwszeństwo przed workMode (stary format obiektowy)
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

  // Buduje FormGroup z dynamicznymi kontrolkami na podstawie danych z backendu.
  // itArea, seniority, workMode, jobSites to zagnieżdżone FormGroup z jednym FormControl per opcja.
  // salaryFromIndex i salaryToIndex to kontrolki przechowujące INDEKS w SALARY_OPTIONS (nie kwotę PLN)
  private buildForm(): FormGroup {
    const v = this.buildFilterValues(this.initialFilters ?? {});
    return this.fb.group({
      itArea:          this.fb.group(v.itArea),       // jeden checkbox per specjalizacja
      seniority:       this.fb.group(v.seniority),    // jeden checkbox per poziom doświadczenia
      workMode:        this.fb.group(v.workMode),     // jeden checkbox per tryb pracy
      salaryFromIndex: [v.salaryFromIndex],           // indeks w SALARY_OPTIONS dla dolnej granicy
      salaryToIndex:   [v.salaryToIndex],             // indeks w SALARY_OPTIONS dla górnej granicy
      jobSites:        this.fb.group(v.jobSites),     // jeden checkbox per portal ogłoszeń
    });
  }

  // Subskrybuje zmiany FormGroup i emituje filtersChange po każdej zmianie.
  // Lokalizacje i technologie NIE są w FormGroup - mają osobne handlery (onLocationsChange, onTechnologiesChange)
  private subscribeFormChanges(): void {
    this.filtersForm?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.filtersChange.emit(this.computeValue());
    });
  }

  // Wywoływane przez LocationPickerComponent przez (selectedChange) w szablonie.
  // Lokalizacje nie są kontrolką ReactiveForm, więc zmiana musi być obsługiwana ręcznie
  onLocationsChange(locations: LocationItem[]): void {
    this.selectedLocations = locations;
    this.filtersChange.emit(this.computeValue());
  }

  // Wywoływane przez TechPickerComponent przez (selectedChange) w szablonie.
  // Analogicznie do lokalizacji - TechPicker ma własny stan poza FormGroup
  onTechnologiesChange(technologies: LocationItem[]): void {
    this.selectedTechnologies = technologies;
    this.filtersChange.emit(this.computeValue());
  }

  // Wywoływane przez kliknięcie przycisku "Szukaj ofert" (showApplyButton = true).
  // checkSalaryRange weryfikuje czy suwak from nie przekracza to przed emitem
  applyFilters(): void {
    this.checkSalaryRange('from');
    this.applyClicked.emit(this.computeValue());
  }

  // Publiczna metoda wywoływana przez parent komponenty (offers, home) do aktualizacji formularza.
  // Przykład: gdy użytkownik kliknie "Uzupełnij z profilu" w offers.component.ts - fillFromProfile()
  // wywołuje patchValue() z danymi z profilu.
  // { emitEvent: false } zapobiega podwójnej emisji - emitujemy ręcznie przez filtersChange na końcu
  patchValue(filters: FiltersInitialState, locations?: LocationItem[]): void {
    if (!this.filtersForm) {
      // FormGroup jeszcze nie zbudowany (dane z backendu nie dotarły) - zapamiętujemy i aplikujemy w ngOnInit
      this.initialFilters = filters;
      if (locations) this.selectedLocations = locations;
      return;
    }

    this.selectedLocations    = locations ?? this.restoreSelectedLocations(filters);
    this.selectedTechnologies = this.restoreSelectedTechs(filters);

    this.filtersForm.patchValue(this.buildPatchValue(filters), { emitEvent: false });
    this.filtersChange.emit(this.computeValue());
  }

  // Kluczowa metoda - konwertuje surowy stan FormGroup na FiltersValue (z filters-form.types.ts).
  // FiltersValue zawiera zarówno surowe obiekty boolean (itArea, technologies, jobSites)
  // jak i przetworzone tablice ID (specializationIds, technologyIds, expLevelIds, workTypeIds, siteIds, locationIds)
  // gotowe do wysłania jako parametry HTTP do API ofert.
  computeValue(): FiltersValue {
    const raw = this.filtersForm?.getRawValue() ?? {};
    const itArea:    Record<string, boolean> = raw.itArea    ?? {};
    const jobSites:  Record<string, boolean> = raw.jobSites  ?? {};
    const workMode:  Record<string, boolean> = raw.workMode  ?? {};

    // specializationIds - tablica ID zaznaczonych specjalizacji (z itArea gdzie wartość === true)
    const specializationIds = this.availableRoles.filter(r => itArea[r.id]).map(r => r.id);

    // technologyIds - tablica ID zaznaczonych technologii (z selectedTechnologies, nie FormGroup)
    const technologyIds = this.selectedTechnologies.map(t => t.id);
    // technologies - pełny obiekt boolean dla wszystkich dostępnych technologii (do badge'y w offers)
    const technologies: Record<string, boolean> = Object.fromEntries(
      this.availableTechs.map(t => [t.id, technologyIds.includes(t.id)])
    );

    // siteIds - puste gdy ŻADEN lub WSZYSTKIE portale zaznaczone (brak filtra = backend zwraca wszystkie).
    // Gdy puste, backend interpretuje jako "brak filtra po portalu" i zwraca oferty ze wszystkich portali
    const allSiteKeys      = this.availableSites.map(s => s.key);
    const selectedSiteKeys = allSiteKeys.filter(k => jobSites[k]);
    const siteIds = (selectedSiteKeys.length === 0 || selectedSiteKeys.length === allSiteKeys.length)
      ? []
      : this.availableSites.filter(s => selectedSiteKeys.includes(s.key) && s.id).map(s => s.id);

    const seniority:  Record<string, boolean> = raw.seniority ?? {};
    // expLevelIds - tablica ID zaznaczonych poziomów doświadczenia
    const expLevelIds = this.availableExpLevels.filter(e => seniority[e.id]).map(e => e.id);

    // workTypeIds - analogicznie do siteIds: puste gdy ŻADEN lub WSZYSTKIE tryby pracy zaznaczone
    const selectedModes = Object.entries(workMode).filter(([, v]) => v).map(([id]) => id);
    const workTypeIds = (selectedModes.length === 0 || selectedModes.length === Object.keys(workMode).length)
      ? []
      : selectedModes;

    const locationIds = this.selectedLocations.filter(l => l.id).map(l => l.id);
    // Konwertujemy indeks suwaka na rzeczywistą kwotę PLN przez SALARY_OPTIONS[index]
    const salaryFrom = this.salaryOptions[Number(raw.salaryFromIndex) || 0] ?? 0;
    const salaryTo   = this.salaryOptions[Number(raw.salaryToIndex)   || this.maxSalaryIndex] ?? 0;

    return {
      // surowe obiekty boolean (do badge'y dopasowania w kartach ofert)
      itArea, technologies, jobSites, workMode, seniority,
      // indeksy suwaka (do serializacji w URL i localStorage)
      salaryFromIndex: Number(raw.salaryFromIndex) || 0,
      salaryToIndex:   Number(raw.salaryToIndex)   || this.maxSalaryIndex,
      // pełne obiekty (do odtworzenia stanu przy patchValue)
      selectedLocations:     this.selectedLocations,
      selectedTechnologies:  this.selectedTechnologies,
      // tablice ID gotowe do wysłania jako parametry HTTP do backendu
      specializationIds, technologyIds, expLevelIds, workTypeIds, siteIds, locationIds,
      // kwoty PLN do filtrowania salary
      salaryFrom, salaryTo,
    };
  }

  // Formatuje ID specjalizacji (np. "backend_dev") na czytelną etykietę (np. "Backend Developer").
  // Używane w szablonie do wyświetlania zaznaczonych ról i w offers.component.ts przez formatRole()
  formatRole(id: string): string {
    return this.availableRoles.find(r => r.id === id)?.label ?? id;
  }

  // Analogicznie do formatRole - zamienia ID technologii na czytelną nazwę
  formatTech(id: string): string {
    return this.availableTechs.find(t => t.id === id)?.label ?? id;
  }

  // Zwraca widoczne role - domyślnie tylko 8 pierwszych, po kliknięciu "Pokaż więcej" wszystkie.
  // Ograniczenie do 8 żeby formularz nie był zbyt długi przy dużej liczbie specjalizacji
  getVisibleRoles(): LookupItem[] {
    return this.showAllRoles ? this.availableRoles : this.availableRoles.slice(0, 8);
  }

  // Getter przeliczający indeks suwaka "od" na kwotę PLN - używany w szablonie do wyświetlania wartości
  get salaryFromValue(): number {
    return this.salaryOptions[Number(this.filtersForm?.get('salaryFromIndex')?.value) || 0] ?? 0;
  }

  // Getter przeliczający indeks suwaka "do" na kwotę PLN
  get salaryToValue(): number {
    return this.salaryOptions[Number(this.filtersForm?.get('salaryToIndex')?.value) || this.maxSalaryIndex] ?? 0;
  }

  // Oblicza szerokość kolorowej belki suwaka salary w procentach (od indeksu "od" do "do").
  // Używany w szablonie jako [style.width.%] na elemencie progress bar
  getSalaryProgressPercent(): number {
    const fromIndex = Number(this.filtersForm?.get('salaryFromIndex')?.value) || 0;
    const toIndex   = Number(this.filtersForm?.get('salaryToIndex')?.value)   || this.maxSalaryIndex;
    return ((toIndex - fromIndex) / this.maxSalaryIndex) * 100;
  }

  // Oblicza przesunięcie belki od lewej krawędzi suwaka w procentach (pozycja indeksu "od").
  // Używany w szablonie jako [style.left.%] na elemencie progress bar
  getSalaryProgressLeft(): number {
    const fromIndex = Number(this.filtersForm?.get('salaryFromIndex')?.value) || 0;
    return (fromIndex / this.maxSalaryIndex) * 100;
  }

  // Zapobiega przecięciu suwaków salary - suwak "od" nie może być >= suwakowi "do" i odwrotnie.
  // { emitEvent: false } - korekta wartości nie powinna wyzwalać kolejnej subskrypcji valueChanges
  checkSalaryRange(type: 'from' | 'to'): void {
    const fromCtrl = this.filtersForm?.get('salaryFromIndex');
    const toCtrl   = this.filtersForm?.get('salaryToIndex');
    if (!fromCtrl || !toCtrl) return;
    const from = Number(fromCtrl.value);
    const to   = Number(toCtrl.value);
    if (type === 'from' && from >= to) {
      // Suwak "od" przekroczył "do" - cofamy "od" o jeden krok
      fromCtrl.setValue(Math.max(0, to - 1), { emitEvent: false });
    } else if (type === 'to' && to <= from) {
      // Suwak "do" cofnął się poniżej "od" - przesuwamy "do" o jeden krok do przodu
      toCtrl.setValue(Math.min(this.maxSalaryIndex, from + 1), { emitEvent: false });
    }
  }

  // Zwija lub rozwija formularz (gdy collapsible = true)
  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
  }

  // Obsługuje wybór poziomu doświadczenia w trybie radio (singleExpLevelSelection = true).
  // Ustawia wybrany poziom na true i wszystkie pozostałe na false w FormGroup seniority.
  // { emitEvent: false } zapobiega wyzwoleniu subscribeFormChanges - emitujemy ręcznie na końcu
  onSingleExpLevelSelect(selectedId: string): void {
    const seniorityGroup = this.filtersForm?.get('seniority') as FormGroup | null;
    if (!seniorityGroup) return;

    Object.keys(seniorityGroup.controls).forEach(id => {
      seniorityGroup.get(id)?.setValue(id === selectedId, { emitEvent: false });
    });

    this.filtersChange.emit(this.computeValue());
  }

  // Reaguje na zmianę @Input() initialFilters z zewnątrz (np. gdy parent odświeża dane).
  // Wywoływane przez Angular gdy wartość @Input zmienia się po pierwszym renderze komponentu.
  // Jeśli formularz jeszcze nie istnieje (dane z backendu nie dotarły), ngOnInit sam zastosuje zmiany
  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['initialFilters'] || !this.filtersForm) return;

    const next = changes['initialFilters'].currentValue as FiltersInitialState | null;
    if (!next) return;

    this.selectedLocations    = this.restoreSelectedLocations(next);
    this.selectedTechnologies = this.restoreSelectedTechs(next);

    // { emitEvent: false } - nie chcemy podwójnej emisji z valueChanges i ręcznego filtersChange
    const patch = this.buildPatchValue(next);
    this.filtersForm.patchValue(patch, { emitEvent: false });

    this.filtersChange.emit(this.computeValue());
    this.cdr.markForCheck();
  }

  // Opakowanie buildFilterValues - zwraca dane w formacie akceptowanym przez FormGroup.patchValue()
  private buildPatchValue(init: FiltersInitialState): Record<string, unknown> {
    return this.buildFilterValues(init);
  }

  // Sprawdza czy dany poziom doświadczenia jest zaznaczony - używane w szablonie
  // przy trybie radio (singleExpLevelSelection = true) do warunkowego dodania klasy CSS
  isExpLevelSelected(id: string): boolean {
    const seniorityGroup = this.filtersForm?.get('seniority') as FormGroup | null;
    return !!seniorityGroup?.get(id)?.value;
  }

  // Getter do FormGroup seniority - bezpośredni dostęp z szablonu bez rzutowania
  get seniorityGroup(): FormGroup | null {
    return (this.filtersForm?.get('seniority') as FormGroup) ?? null;
  }

  ngOnDestroy(): void {
    // Anulujemy wszystkie subskrypcje RxJS - forkJoin, valueChanges
    this.destroy$.next();
    this.destroy$.complete();
  }
}
