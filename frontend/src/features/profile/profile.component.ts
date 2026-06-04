// Strona /profile - edycja profilu zalogowanego użytkownika.
// FiltersFormComponent reużywany w trybie uproszczonym: tylko seniority (radio) i technologie.
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { NavbarComponent } from '../../app/shared/navbar/navbar.component';
import { FooterComponent } from '../../app/shared/footer/footer.component';
import { FiltersFormComponent } from '../../app/shared/filters-form/filters-form.component';
import { FiltersInitialState, FiltersValue } from '../../app/shared/filters-form/filters-form.types';
import { AuthService } from '../auth/auth.service';
import { CvApiService } from '../../app/core/services/cv-api.service';
import {
  UserApiService,
  UserMeDto,
  UserProfileDto,
  UserProfileUpdateDto,
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
  // Używana do ręcznego patchValue() gdy dane z backendu dotrą po inicjalizacji formularza
  @ViewChild(FiltersFormComponent) filtersFormRef?: FiltersFormComponent;

  email     = '';
  firstName = '';
  lastName  = '';

  currentCvFile: string | null = null;
  currentCvDate = '';
  isDragging    = false;

  isScanning    = false;
  scanProgress  = 0;
  scanStatus    = '';
  scanComplete  = false;

  // savedFilters - przekazywane do [initialFilters] formularza przy jego inicjalizacji
  savedFilters: FiltersInitialState | null = null;
  // currentFilterValue - aktualizowane przez (filtersChange), używane przy zapisie profilu
  private currentFilterValue: FiltersValue | null = null;

  isSaving     = false;
  loadError: string | null = null;
  saveError: string | null = null;
  saveSuccess: string | null = null; // znika po 3 sekundach

  private saveSuccessTimer: ReturnType<typeof setTimeout> | null = null;
  // Tablica timerów animacji skanowania - czyszczona w ngOnDestroy żeby nie wyciekać
  private scanTimers: ReturnType<typeof setTimeout>[] = [];
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly authService: AuthService,
    private readonly userApi: UserApiService,
    private readonly cvApi: CvApiService,
    private readonly cdr: ChangeDetectorRef,
    // PLATFORM_ID - potrzebne bo localStorage i FileReader nie istnieją w SSR
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // Etap 1: dane z tokena JWT (natychmiast, bez requestu)
    this.initFromToken();
    // Etap 2: pełne dane z backendu (może nadpisać dane z tokena)
    await this.loadUserDataFromBackend();
  }

  private initFromToken(): void {
    const profile = this.authService.getProfile();
    this.email     = profile.email;
    this.firstName = profile.firstName ?? '';
    this.lastName  = profile.lastName  ?? '';
  }

  // 404 z /users/me/profile jest oczekiwany dla nowych użytkowników bez profilu
  private async loadUserDataFromBackend(): Promise<void> {
    this.loadError = null;

    try {
      const me = await this.userApi.getMe();
      this.patchUserData(me);

      try {
        const profile = await this.userApi.getMyProfile();
        this.patchProfileData(profile);
      } catch (error) {
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

  // ?? this.xxx - zachowujemy dane z tokena gdy backend zwróci null
  private patchUserData(me: UserMeDto): void {
    this.email     = me.email      ?? this.email;
    this.firstName = me.first_name ?? this.firstName;
    this.lastName  = me.last_name  ?? this.lastName;
  }

  // Buduje savedFilters i currentFilterValue z danych profilu.
  // Wywoływane też po udanym onSave() żeby zsynchronizować stan z odpowiedzią backendu
  private patchProfileData(profile: UserProfileDto): void {
    const selectedTechnologies = (profile.technologies ?? []).map(t => ({
      id: t.id,
      name: t.name,
    }));

    const expLevelId = profile.exp_level?.id ?? '';

    this.savedFilters = {
      selectedTechnologies,
      technologies: Object.fromEntries(selectedTechnologies.map(t => [t.id, true])),
      seniority: expLevelId ? { [expLevelId]: true } : {},
    };
    this.filtersFormRef?.patchValue(this.savedFilters);
    this.cdr.markForCheck();

    // Pełny FiltersValue potrzebny przez buildProfilePayload() - większość pól domyślna
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

  onFiltersChange(value: FiltersValue): void {
    this.currentFilterValue = value;
  }

  // expLevelIds[0] bo profil obsługuje tylko jeden poziom (singleExpLevelSelection = true)
  private buildProfilePayload(): { exp_level_id: string; technology_ids: string[] } {
    return {
      exp_level_id:   this.currentFilterValue?.expLevelIds?.[0] ?? '',
      technology_ids: this.currentFilterValue?.technologyIds    ?? [],
    };
  }

  // preventDefault() wymagane żeby przeglądarka nie otwierała pliku we własnym oknie
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

  // input.value = '' czyści input - bez tego ten sam plik nie wywoła change event ponownie
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

  // Animacja paska postępu jest sztuczna - API nie zwraca progress, setTimeout symuluje etapy
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
    this.scanTimers.forEach(t => clearTimeout(t));
    clearTimeout(this.saveSuccessTimer ?? undefined);
    // destroy$ anuluje uploadCv jeśli użytkownik opuści stronę podczas uploadu
    this.destroy$.next();
    this.destroy$.complete();
  }
}
