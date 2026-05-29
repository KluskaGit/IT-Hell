// Komponent strony /profile - edycja profilu zalogowanego użytkownika.
// Pobiera dane z dwóch endpointów backendu:
//   GET /v1/users/me         - podstawowe dane konta (email, imię, nazwisko)
//   GET /v1/users/me/profile - preferencje zawodowe (technologie, poziom doświadczenia, CV)
// Zapis przez PUT /v1/users/me/profile (UserApiService).
// Formularz filtrów (FiltersFormComponent) reużywa tego samego komponentu co /home i /offers
// ale w trybie uproszczonym: tylko seniority (radio) i technologie, bez lokalizacji i salary.
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { NavbarComponent } from '../../app/shared/navbar/navbar.component';
import { FooterComponent } from '../../app/shared/footer/footer.component';
// FiltersFormComponent reużywany do wyboru technologii i poziomu doświadczenia
import { FiltersFormComponent } from '../../app/shared/filters-form/filters-form.component';
// FiltersInitialState - stan przekazywany do formularza, FiltersValue - stan odczytywany z formularza
import { FiltersInitialState, FiltersValue } from '../../app/shared/filters-form/filters-form.types';
// AuthService - Keycloak, dostarcza dane z tokena JWT (email, imię, nazwisko)
import { AuthService } from '../auth/auth.service';
// CvApiService - upload CV do backendu POST /v1/cv/upload, zwraca wykryte technologie
import { CvApiService } from '../../app/core/services/cv-api.service';
import {
  UserApiService,
  UserMeDto,          // DTO z GET /v1/users/me - podstawowe dane konta
  UserProfileDto,     // DTO z GET /v1/users/me/profile - preferencje zawodowe
  UserProfileUpdateDto, // DTO do PUT /v1/users/me/profile - payload zapisu
} from '../../app/core/services/user-api.service';

// Maksymalny rozmiar pliku CV - walidacja przed uploadem do backendu
const MAX_CV_SIZE_MB    = 10;
const MAX_CV_SIZE_BYTES = MAX_CV_SIZE_MB * 1024 * 1024;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent, FiltersFormComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  // Referencja do FiltersFormComponent w szablonie - używana do ręcznego patchValue()
  // gdy dane z backendu dotrą po tym jak formularz jest już zainicjowany
  @ViewChild(FiltersFormComponent) filtersFormRef?: FiltersFormComponent;

  // Dane podstawowe użytkownika - wczytywane najpierw z tokena JWT (initFromToken),
  // potem nadpisywane danymi z GET /v1/users/me (patchUserData)
  email     = '';
  firstName = '';
  lastName  = '';

  // Informacje o aktualnie załadowanym CV
  currentCvFile: string | null = null; // nazwa pliku lub null gdy brak CV
  currentCvDate = '';                   // data wgrania (lub 'Właśnie teraz' po nowym uploadzie)
  isDragging    = false;                // flaga drag&drop strefy uploadu CV

  // Stan animacji skanowania CV po uploadzie
  isScanning    = false;  // true podczas uploadu i analizy CV przez backend
  scanProgress  = 0;      // wartość 0-100 paska postępu (symulowana animacja)
  scanStatus    = '';     // tekst wyświetlany pod paskiem (np. "Analiza CV..." / "Zakończono!")
  scanComplete  = false;  // true gdy skanowanie zakończyło się sukcesem

  // Stan formularza preferencji zawodowych (FiltersFormComponent)
  // savedFilters - przekazywane do [initialFilters] formularza przy jego inicjalizacji
  savedFilters: FiltersInitialState | null = null;
  // currentFilterValue - aktualizowane przez (filtersChange), używane przy zapisie profilu
  private currentFilterValue: FiltersValue | null = null;

  // Stan operacji zapisu profilu
  isSaving     = false;       // true podczas trwania PUT /v1/users/me/profile
  loadError: string | null = null;   // błąd ładowania danych (GET /v1/users/me lub /profile)
  saveError: string | null = null;   // błąd zapisu profilu lub walidacji pliku CV
  saveSuccess: string | null = null; // komunikat sukcesu po udanym zapisie (znika po 3s)

  // Timer do automatycznego ukrycia komunikatu sukcesu po 3 sekundach
  private saveSuccessTimer: ReturnType<typeof setTimeout> | null = null;
  // Tablica timerów animacji skanowania CV - czyszczona w ngOnDestroy żeby nie wyciekać
  private scanTimers: ReturnType<typeof setTimeout>[] = [];
  // Subject do anulowania subskrypcji RxJS przy zniszczeniu komponentu
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly authService: AuthService,
    private readonly userApi: UserApiService,
    private readonly cvApi: CvApiService,
    private readonly cdr: ChangeDetectorRef,
    // PLATFORM_ID - sprawdzamy czy kod działa w przeglądarce (nie podczas SSR)
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  // ngOnInit jest async bo loadUserDataFromBackend używa await (dwa kolejne requesty do API)
  async ngOnInit(): Promise<void> {
    // Cały komponent wymaga przeglądarki - localStorage, FileReader itp. nie istnieją w SSR
    if (!isPlatformBrowser(this.platformId)) return;

    // Etap 1: natychmiastowe wczytanie podstawowych danych z tokena JWT (bez requestu do API)
    this.initFromToken();
    // Etap 2: wczytanie pełnych danych z backendu (może nadpisać dane z tokena)
    await this.loadUserDataFromBackend();
  }

  // Wczytuje email, imię i nazwisko z tokena Keycloak przez AuthService.getProfile().
  // Wywoływane natychmiast w ngOnInit bez oczekiwania na backend - dane z tokena są dostępne od razu
  private initFromToken(): void {
    const profile = this.authService.getProfile();
    this.email     = profile.email;
    this.firstName = profile.firstName ?? '';
    this.lastName  = profile.lastName  ?? '';
  }

  // Pobiera dane użytkownika z backendu w dwóch krokach.
  // Krok 1: GET /v1/users/me - dane konta (email, imię, nazwisko z bazy, nie z tokena)
  // Krok 2: GET /v1/users/me/profile - preferencje zawodowe (technologie, exp_level, CV)
  // Krok 2 jest zagnieżdżony w try/catch bo 404 jest oczekiwanym stanem dla nowych użytkowników
  // którzy jeszcze nie skonfigurowali preferencji
  private async loadUserDataFromBackend(): Promise<void> {
    this.loadError = null;

    try {
      const me = await this.userApi.getMe();
      this.patchUserData(me);

      try {
        const profile = await this.userApi.getMyProfile();
        this.patchProfileData(profile);
      } catch (error) {
        // 404 z /users/me/profile = nowy użytkownik bez profilu - inicjalizujemy pusty stan
        // zamiast pokazywać błąd, co pozwala użytkownikowi wypełnić profil od zera
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.savedFilters = {
            selectedTechnologies: [],
            technologies: {},
            seniority: {},
          };
          this.cdr.markForCheck();
          return;
        }
        throw error; // inny błąd (np. 500) - propagujemy do zewnętrznego catch
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      this.loadError = 'Nie udało się pobrać danych profilu z backendu.';
      this.cdr.detectChanges();
    }
  }

  // Nadpisuje podstawowe dane użytkownika danymi z GET /v1/users/me.
  // ?? this.xxx - zachowujemy dane z tokena jeśli backend zwróci null dla danego pola
  private patchUserData(me: UserMeDto): void {
    this.email     = me.email      ?? this.email;
    this.firstName = me.first_name ?? this.firstName;
    this.lastName  = me.last_name  ?? this.lastName;
  }

  // Przetwarza dane z GET /v1/users/me/profile i ustawia stan formularza preferencji.
  // Buduje savedFilters (dla [initialFilters] formularza) i currentFilterValue (dla zapisu).
  // Wywoływane też po udanym zapisie profilu (onSave) żeby zsynchronizować stan z backendem
  private patchProfileData(profile: UserProfileDto): void {
    // Konwertujemy technologie z backendu na format LocationItem {id, name} dla FiltersForm
    const selectedTechnologies = profile.technologies.map(t => ({
      id: t.id,
      name: t.name,
    }));

    // expLevelId - ID wybranego poziomu doświadczenia (może być pusty gdy nie ustawiony)
    const expLevelId = profile.exp_level?.id ?? '';

    // savedFilters - przekazywany do [initialFilters] formularza.
    // Zawiera tylko pola które FiltersFormComponent rozumie jako stan seniority i technologii
    this.savedFilters = {
      selectedTechnologies,
      technologies: Object.fromEntries(selectedTechnologies.map(t => [t.id, true])),
      seniority: expLevelId ? { [expLevelId]: true } : {},
    };
    // patchValue() aktualizuje formularz gdy już istnieje (np. gdy profil ładuje się po inicjalizacji formularza)
    this.filtersFormRef?.patchValue(this.savedFilters);
    this.cdr.markForCheck();

    // currentFilterValue - pełny FiltersValue potrzebny przez buildProfilePayload() przy zapisie.
    // Większość pól jest pusta/domyślna bo profil używa tylko seniority i technologii
    this.currentFilterValue = {
      itArea: {},
      technologies: Object.fromEntries(selectedTechnologies.map(t => [t.id, true])),
      jobSites: {},
      workMode: {},
      seniority: expLevelId ? { [expLevelId]: true } : {},
      salaryFromIndex: 0,
      salaryToIndex: 25,   // domyślny indeks suwaka salary (nie używany w profilu)
      selectedLocations:    [],
      selectedTechnologies,
      specializationIds:    [],
      technologyIds:        selectedTechnologies.map(t => t.id),
      expLevelIds:          expLevelId ? [expLevelId] : [],
      workTypeIds:          [],
      siteIds:              [],
      locationIds:          [],
      salaryFrom: 0,
      salaryTo:   50000,
    };

    // raw_cv !== null oznacza że użytkownik ma już wgrane CV w backendzie
    this.currentCvFile = profile.raw_cv !== null ? 'Plik CV' : null;
    this.currentCvDate = '';
  }

  // Wywoływane przez (filtersChange) z FiltersFormComponent przy każdej zmianie formularza.
  // Aktualizuje currentFilterValue który jest używany przez onSave() przy zapisie profilu
  onFiltersChange(value: FiltersValue): void {
    this.currentFilterValue = value;
  }

  // Buduje payload do PUT /v1/users/me/profile z aktualnego stanu formularza.
  // Profil zapisuje tylko exp_level_id i technology_ids - pozostałe pola FiltersValue są ignorowane.
  // expLevelIds[0] bo profil obsługuje tylko jeden poziom doświadczenia (singleExpLevelSelection = true)
  private buildProfilePayload(): { exp_level_id: string; technology_ids: string[] } {
    return {
      exp_level_id:   this.currentFilterValue?.expLevelIds?.[0] ?? '',
      technology_ids: this.currentFilterValue?.technologyIds    ?? [],
    };
  }

  // Obsługa drag&drop strefy uploadu CV - e.preventDefault() wymagane żeby przeglądarka
  // nie otwierała pliku we własnym oknie zamiast przekazać go do handlera
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = false;
  }

  // Obsługuje upuszczenie pliku na strefę drag&drop - pobiera pierwszy plik z dataTransfer
  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = false;
    if (e.dataTransfer?.files.length) this.handleFile(e.dataTransfer.files[0]);
  }

  // Obsługuje wybór pliku przez kliknięcie i standardowe okno dialogowe przeglądarki.
  // input.value = '' czyści input po obsłudze - bez tego ten sam plik nie wywoła change event drugi raz
  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) this.handleFile(input.files[0]);
    input.value = '';
  }

  // Waliduje plik CV (rozszerzenie i rozmiar) i uruchamia upload jeśli przejdzie walidację.
  // Błędy walidacji wyświetlane przez saveError w szablonie
  private handleFile(file: File): void {
    const allowed = ['.pdf', '.doc', '.docx'];
    const name    = file.name.toLowerCase();

    if (!allowed.some(ext => name.endsWith(ext))) {
      this.saveError = 'Dozwolone są tylko pliki PDF, DOC, DOCX!';
      return;
    }

    if (file.size > MAX_CV_SIZE_BYTES) {
      this.saveError = `Plik jest za duży. Maksymalny rozmiar to ${MAX_CV_SIZE_MB} MB.`;
      return;
    }

    this.saveError     = null;
    this.currentCvFile = file.name;
    this.currentCvDate = 'Właśnie teraz';
    this.analyzeCV(file);
  }

  // Uploaduje CV do backendu POST /v1/cv/upload i odbiera listę wykrytych technologii.
  // Animacja paska postępu jest sztuczna (API nie zwraca progress) - setTimeout symuluje etapy.
  // Po sukcesie aktualizuje filtersForm przez patchValue() dodając wykryte technologie
  private analyzeCV(file: File): void {
    this.isScanning   = true;
    this.scanProgress = 0;
    this.scanStatus   = 'Analiza CV...';
    this.saveError    = null;

    // Sztuczny progress 35% po 200ms - wizualna informacja że coś się dzieje zanim API odpowie
    this.scanTimers.push(setTimeout(() => {
      this.scanProgress = 35;
    }, 200));

    this.cvApi.uploadCv(file).pipe(takeUntil(this.destroy$)).subscribe({
      next: (techs) => {
        this.scanProgress = 100;
        this.scanStatus   = 'Zakończono!';

        const selectedTechnologies = techs.map(t => ({
          id: t.id,
          name: t.name,
        }));

        // Opóźnienie 150ms przed ukryciem paska - żeby użytkownik zdążył zobaczyć 100%
        this.scanTimers.push(setTimeout(() => {
          this.isScanning   = false;
          this.scanComplete = true;

          // Zachowujemy bieżące filtry (seniority) i nadpisujemy tylko technologie z CV.
          // Spread savedFilters ?? {} zabezpiecza gdy profil nie był wcześniej załadowany
          const nextFilters: FiltersInitialState = {
            ...(this.savedFilters ?? {}),
            selectedTechnologies,
            technologies: Object.fromEntries(selectedTechnologies.map(t => [t.id, true])),
          };

          this.savedFilters = nextFilters;
          // Aktualizujemy formularz z nowymi technologiami
          this.filtersFormRef?.patchValue(nextFilters);

          // Synchronizujemy currentFilterValue z nowymi technologiami żeby onSave() miało aktualne dane
          if (this.currentFilterValue) {
            this.currentFilterValue = {
              ...this.currentFilterValue,
              selectedTechnologies,
              technologies:  Object.fromEntries(selectedTechnologies.map(t => [t.id, true])),
              technologyIds: selectedTechnologies.map(t => t.id),
            };
          }

          // Formatujemy datę uploadu po polsku (np. "28.05.2026, 14:35")
          this.currentCvDate = new Date().toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
        }, 150));
      },
      error: (error) => {
        console.error('Błąd analizy CV:', error);
        this.scanProgress = 100;
        this.scanStatus   = 'Nie udało się przeanalizować CV';

        this.scanTimers.push(setTimeout(() => {
          this.isScanning   = false;
          this.scanComplete = false;
          this.saveError    = 'Nie udało się przeanalizować CV.';
        }, 150));
      },
    });
  }

  // Usuwa informację o załadowanym CV z widoku (nie wysyła requestu DELETE do backendu)
  removeCv(): void {
    this.currentCvFile = null;
    this.currentCvDate = '';
    this.scanComplete  = false;
  }

  // Zapisuje profil użytkownika przez PUT /v1/users/me/profile.
  // Waliduje czy exp_level_id jest wybrany (wymagane pole backendu).
  // Po sukcesie patchuje lokalny stan przez patchProfileData() i pokazuje komunikat sukcesu na 3 sekundy
  async onSave(): Promise<void> {
    if (!this.currentFilterValue) {
      this.saveError = 'Najpierw wybierz poziom doświadczenia i technologie.';
      return;
    }

    const payload = this.buildProfilePayload();

    // Walidacja po stronie klienta - backend też waliduje ale dajemy szybką odpowiedź
    if (!payload.exp_level_id) {
      this.saveError = 'Wybierz poziom doświadczenia.';
      return;
    }

    this.isSaving     = true;
    this.saveError    = null;
    this.saveSuccess  = null;
    // Czyścimy poprzedni timer sukcesu żeby nie ukrył nowego komunikatu zbyt wcześnie
    clearTimeout(this.saveSuccessTimer ?? undefined);

    try {
      const updatePayload: UserProfileUpdateDto = {
        exp_level_id:   payload.exp_level_id,
        technology_ids: payload.technology_ids,
      };
      // PUT /v1/users/me/profile - zwraca zaktualizowany UserProfileDto
      const savedProfile = await this.userApi.updateMyProfile(updatePayload);
      // Synchronizujemy lokalny stan z odpowiedzią backendu (zamiast ufać lokalnemu stanowi)
      this.patchProfileData(savedProfile);
      this.saveSuccess = 'Profil został zapisany.';
      // Komunikat sukcesu znika automatycznie po 3 sekundach
      this.saveSuccessTimer = setTimeout(() => {
        this.saveSuccess = null;
        this.cdr.detectChanges();
      }, 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
      this.saveError = 'Nie udało się zapisać profilu.';
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    // Czyścimy wszystkie timery animacji skanowania żeby nie wyciekały po opuszczeniu strony
    this.scanTimers.forEach(t => clearTimeout(t));
    // Czyścimy timer komunikatu sukcesu
    clearTimeout(this.saveSuccessTimer ?? undefined);
    // Anulujemy subskrypcję uploadCv - zatrzymuje request jeśli użytkownik opuści stronę podczas uploadu
    this.destroy$.next();
    this.destroy$.complete();
  }
}
