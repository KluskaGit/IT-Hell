// Komponent strony głównej (/home) - punkt wejścia aplikacji dla kandydatów.
// Odpowiada za:
//   1. Formularz filtrów (technologie, doświadczenie, lokalizacja...) - delegowany do FiltersFormComponent
//   2. Upload i analizę CV (POST /v1/cv/analyze przez CvApiService) - wypełnia technologie automatycznie
//   3. Przycisk "Uzupełnij z profilu" - pobiera dane z GET /v1/users/me/profile (UserApiService)
//   4. Nawigację do /offers z filtrami w history.state (router.navigate + state)
//   5. Zapis filtrów do localStorage pod kluczem FILTERS_STORAGE_KEY (patrz: filters-form.types.ts)
//
// Powiązane pliki:
//   home.component.html   - szablon z formularzem filtrów i dropzoną CV
//   home.component.css    - style strony
//   filters-form.component.ts  - cały formularz filtrów jako reużywalny komponent
//   cv-api.service.ts     - upload CV do backendu (POST /v1/cv/analyze)
//   user-api.service.ts   - pobranie profilu użytkownika (GET /v1/users/me/profile)
//   filters-form.types.ts - typy FiltersValue, FiltersInitialState, FILTERS_STORAGE_KEY

import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NavbarComponent } from '../../app/shared/navbar/navbar.component';
import { FooterComponent } from '../../app/shared/footer/footer.component';
import { FiltersFormComponent } from '../../app/shared/filters-form/filters-form.component';
import { FiltersInitialState, FiltersValue, FILTERS_STORAGE_KEY } from '../../app/shared/filters-form/filters-form.types';
import { AuthService } from '../auth/auth.service';
import { CvApiService } from '../../app/core/services/cv-api.service';
import { UserApiService } from '../../app/core/services/user-api.service';

// Limit rozmiaru pliku CV - zdefiniowany poza klasą jako stała modułu (nie zmienia się w runtime).
// 10 MB to kompromis: większość CV w PDF/DOC mieści się w tym limicie,
// a zbyt duże pliki spowalniają upload i analizę po stronie backendu.
// MAX_CV_SIZE_BYTES to przeliczona wartość do porównania z file.size (które jest w bajtach)
const MAX_CV_SIZE_MB = 10;
const MAX_CV_SIZE_BYTES = MAX_CV_SIZE_MB * 1024 * 1024;

@Component({
  selector: 'app-home',
  standalone: true,
  // Standalone component - nie wymaga NgModule. Importuje tylko to czego używa bezpośrednio.
  // CommonModule: *ngIf, *ngFor, AsyncPipe itp.
  // RouterModule: routerLink w szablonie
  // NavbarComponent, FooterComponent: wspólne elementy layoutu strony
  // FiltersFormComponent: cały formularz filtrów (sekcja "Szukaj ofert")
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent, FiltersFormComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {

  // Referencja do instancji FiltersFormComponent w szablonie.
  // Używana do bezpośredniego wywoływania metod komponentu:
  //   filtersFormRef?.computeValue() - odczytanie aktualnych filtrów przed zapisem
  //   filtersFormRef?.patchValue(...)  - programatyczne ustawienie wartości formularza
  //                                     np. po analizie CV lub po "Uzupełnij z profilu"
  @ViewChild(FiltersFormComponent) filtersFormRef?: FiltersFormComponent;

  // Subject do zarządzania cyklem życia subskrypcji RxJS.
  // takeUntil(this.destroy$) w każdej subskrypcji sprawia że RxJS automatycznie
  // odsubskrybuje strumień gdy destroy$.next() wywoła się w ngOnDestroy.
  // Bez tego - subskrypcje żyłyby po zniszczeniu komponentu (wyciek pamięci).
  private readonly destroy$ = new Subject<void>();

  // Tablica identyfikatorów setTimeout - przechowywana żeby można było je anulować w ngOnDestroy.
  // analyzeCV() tworzy kilka timerów (fałszywa animacja postępu) które muszą być
  // wyczyszczone gdy użytkownik opuści stronę zanim animacja się skończy.
  // ReturnType<typeof setTimeout> zamiast "number" - kompatybilność z Node.js (zwraca obiekt Timeout)
  private scanTimers: ReturnType<typeof setTimeout>[] = [];

  constructor(
    // Router - do nawigacji na /offers po kliknięciu "Szukaj ofert" (onSubmit)
    private readonly router: Router,
    // AuthService - sprawdzenie czy użytkownik jest zalogowany (Keycloak).
    // Używany przez getter isAuthenticated do warunkowego wyświetlania "Uzupełnij z profilu"
    private readonly authService: AuthService,
    // ChangeDetectorRef - ręczne powiadamianie Angular że stan się zmienił.
    // Potrzebne bo operacje wewnątrz setTimeout / callback API nie są wykrywane automatycznie
    // przez Angular Change Detection (nie przechodzą przez zone.js w niektórych przypadkach)
    private readonly cdr: ChangeDetectorRef,
    // CvApiService - upload pliku CV do backendu (POST /v1/cv/analyze).
    // Backend zwraca listę wykrytych technologii, które wpadają do filtra automatycznie
    private readonly cvApi: CvApiService,
    // UserApiService - pobranie profilu użytkownika z backendu (GET /v1/users/me/profile).
    // Używany przez fillFromProfile() do wstępnego wypełnienia formularza filtrów
    private readonly userApi: UserApiService,
    // PLATFORM_ID - token Angular który identyfikuje platformę uruchomienia (browser/server).
    // Używany z isPlatformBrowser() żeby zabezpieczyć się przed SSR (Server Side Rendering):
    // localStorage i FileReader nie istnieją w środowisku Node.js - bez tego guard aplikacja crashuje
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  // Wybrany plik CV - ustawiany po walidacji w handleFile(), kasowany przez removeFile()
  selectedFile: File | null = null;
  // Komunikat błędu uploadu (np. zły format, zbyt duży plik)
  uploadError: string | null = null;
  // Flaga drag&drop - true gdy użytkownik przeciąga plik nad dropzoną
  isDragging = false;
  // Flaga skanowania - true od momentu wysłania pliku do API do zakończenia animacji
  isScanning = false;
  // Postęp animacji skanowania (0-100) - steruje paskiem w szablonie
  scanProgress = 0;
  // Tekst statusu skanowania - zmienia się etapami ("Analiza CV...", "Zakończono!")
  scanStatus = '';
  // Flaga zakończenia - true gdy API zwróciło wynik i animacja dobiegła końca
  scanComplete = false;
  // Flaga trwania "Uzupełnij z profilu" - blokuje wielokrotne kliknięcia
  isFillingFromProfile = false;
  // Komunikat błędu gdy pobranie profilu z backendu nie powiodło się
  fillProfileError: string | null = null;

  // Stan filtrów przekazywany do FiltersFormComponent jako [initialFilters].
  // Ustawiany przez fillFromProfile() po pobraniu danych z API.
  // Typ FiltersInitialState (patrz: filters-form.types.ts) - częściowy, nie wszystkie pola muszą być wypełnione
  savedFilters: FiltersInitialState | null = null;

  // Pobiera dane z profilu użytkownika i wstępnie wypełnia formularz filtrów.
  // Wywołanie z HTML: (profileFillClicked)="fillFromProfile()" w app-filters-form.
  // Dostępne tylko dla zalogowanych użytkowników (guard isPlatformBrowser + isAuthenticated).
  // async/await zamiast .subscribe() bo UserApiService.getMyProfile() zwraca Promise
  async fillFromProfile(): Promise<void> {
    // isPlatformBrowser - zabezpieczenie przed SSR (Node.js nie ma localStorage/Keycloak)
    if (!isPlatformBrowser(this.platformId) || !this.isAuthenticated()) return;

    this.isFillingFromProfile = true;
    this.fillProfileError = null;

    try {
      // GET /v1/users/me/profile - pobiera technologie i poziom doświadczenia z backendu.
      // Rzuci błąd 404 jeśli użytkownik nigdy nie zapisał profilu
      const profile = await this.userApi.getMyProfile();

      // Mapowanie technologii z formatu API ({ id, name, ...inne pola }) na LocationItem { id, name }.
      // FiltersFormComponent (TechPicker) oczekuje dokładnie tego formatu
      const selectedTechnologies = profile.technologies.map(t => ({
        id: t.id,
        name: t.name,
      }));

      // exp_level może być null (jeśli użytkownik nie wybrał) - ?? '' zwraca pusty string
      const expLevelId = profile.exp_level?.id ?? '';

      // Budowanie nowego stanu filtrów: spread aktualnych filtrów z formularza,
      // nadpisując tylko technologie i seniority danymi z profilu.
      // computeValue() odczytuje aktualny stan FiltersFormComponent (lokalizacja, wynagrodzenie itp.)
      // dzięki temu dane które użytkownik już ustawił ręcznie nie są kasowane.
      // technologies: Object.fromEntries(...) - stary format { id: true } dla wstecznej kompatybilności.
      // selectedTechnologies - nowy format tablic obiektów { id, name } dla TechPickera.
      // Oba formaty opisane w FiltersInitialState w filters-form.types.ts
      const nextFilters: FiltersInitialState = {
        ...(this.filtersFormRef?.computeValue() ?? {}),
        selectedTechnologies,
        technologies: Object.fromEntries(selectedTechnologies.map(t => [t.id, true])),
        seniority: expLevelId ? { [expLevelId]: true } : {},
      };

      // savedFilters to @Input dla FiltersFormComponent - zmiana wartości wyzwoli ponowne
      // patchValue w FiltersFormComponent.ngOnChanges() (patrz: filters-form.component.ts)
      this.savedFilters = nextFilters;
      // Bezpośredni patch - szybsza ścieżka niż czekanie na ngOnChanges
      this.filtersFormRef?.patchValue(nextFilters);
      // Zapis do localStorage żeby stan przeżył nawigację do /offers i powrót
      this.autoFillForm();
      // Ręczne powiadomienie Angular CD - konieczne bo to async callback
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Failed to fill form from profile:', error);
      this.fillProfileError = 'Nie udało się pobrać danych z profilu.';
    } finally {
      this.isFillingFromProfile = false;
    }
  }

  ngOnInit(): void {
    // Blok tylko dla przeglądarki - guard przed SSR.
    // Na serwerze nie ma router.events do subskrybowania
    if (!isPlatformBrowser(this.platformId)) return;
    // Subskrypcja na zdarzenia routera - wywołuje markForCheck() przy każdej nawigacji.
    // Konieczne gdy komponent używa OnPush change detection i router zmienia URL
    // bez fizycznego zniszczenia i ponownego stworzenia komponentu
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    // Anulowanie wszystkich aktywnych timerów (setTimeout z analyzeCV).
    // Bez tego callback timera może uruchomić się po zniszczeniu komponentu
    // i próbować zmienić stan nieistniejącego komponentu (błąd w Angular)
    this.scanTimers.forEach(t => clearTimeout(t));
    // Sygnał do wszystkich takeUntil(destroy$) - kończy wszystkie aktywne subskrypcje RxJS
    this.destroy$.next();
    // Zamknięcie Subject - zwalnia zasoby wewnętrzne RxJS
    this.destroy$.complete();
  }

  // Zapisuje aktualny stan filtrów do localStorage.
  // Zapisywane są tylko surowe obiekty boolean i indeksy (nie przeliczone tablice ID),
  // bo te są wyliczane dynamicznie przez computeValue() przy każdym odczycie.
  // FILTERS_STORAGE_KEY (patrz: filters-form.types.ts) to stały klucz współdzielony
  // z /offers i /profile - zmiana filtrów na /home jest widoczna na /offers po nawigacji
  private saveFilters(value: FiltersValue): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      // Destrukturyzacja tylko tych pól które mają sens w localStorage.
      // Nie zapisujemy specializationIds / technologyIds itp. bo są przeliczane dynamicznie.
      // selectedLocations / selectedTechnologies zapisujemy jako obiekty { id, name }
      // żeby picker mógł odtworzyć stan bez ponownego szukania po ID w backendzie
      const { itArea, jobSites, workMode, seniority,
              salaryFromIndex, salaryToIndex,
              selectedLocations, selectedTechnologies } = value;
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({
        itArea, jobSites, workMode, seniority,
        salaryFromIndex, salaryToIndex,
        selectedLocations, selectedTechnologies,
      }));
    } catch { /* ignore - localStorage może być niedostępny (tryb prywatny, brak miejsca) */ }
  }

  // Wywoływane przez (applyClicked) z FiltersFormComponent gdy użytkownik kliknie "Szukaj ofert".
  // Zapisuje filtry do localStorage i nawiguje do /offers z filtrami w history.state.
  // history.state (state: { filters, cvFileName }) jest odczytywany w offers.component.ts
  // w subskrypcji route.queryParamMap - patrz logika priorytetu źródeł w offers.component.ts
  onSubmit(value: FiltersValue): void {
    this.saveFilters(value);
    this.router.navigate(['/offers'], {
      // cvFileName - nazwa pliku CV (jeśli wgrany) przekazywana do /offers żeby wyświetlić badge
      state: { filters: value, cvFileName: this.selectedFile?.name ?? null },
    });
  }

  // Prywatna metoda - zapisuje aktualny stan formularza do localStorage po programatycznym patchu.
  // Wywołana po fillFromProfile() i po analizie CV żeby localStorage był zawsze aktualny.
  // Bez tego: fillFromProfile() zmieniłby formularz ale localStorage zostałby z poprzednim stanem,
  // a przy następnej nawigacji /offers->/home stan formularza cofnąłby się
  private autoFillForm(): void {
    const value = this.filtersFormRef?.computeValue();
    if (value) this.saveFilters(value);
  }

  // Usuwa wgrany plik CV i resetuje stan analizy.
  // e.stopPropagation() - przycisk "Usuń" jest wewnątrz elementu dropzone który ma (click).
  // Bez stopPropagation kliknięcie "Usuń" wywołałoby też kliknięcie dropzone -> otwarcie dialogu
  removeFile(e: Event): void {
    e.stopPropagation();
    this.selectedFile = null;
    this.scanComplete = false;
    // Czyszczenie technologii wykrytych z CV w formularzu filtrów
    this.filtersFormRef?.patchValue({ selectedTechnologies: [] });
  }

  // Waliduje plik i inicjuje analizę.
  // Sprawdza format i rozmiar PRZED wysłaniem do API - szybka odpowiedź dla użytkownika.
  // file.name.toLowerCase() - porównanie case-insensitive (ważne na Windows gdzie "CV.PDF" jest OK)
  private handleFile(file: File): void {
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    if (!allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      this.uploadError = 'Dozwolone są tylko pliki PDF, DOC, DOCX!';
      return;
    }

    // file.size jest w bajtach - porównanie z MAX_CV_SIZE_BYTES (10 * 1024 * 1024)
    if (file.size > MAX_CV_SIZE_BYTES) {
      this.uploadError = `Plik jest za duży. Maksymalny rozmiar to ${MAX_CV_SIZE_MB} MB.`;
      return;
    }

    this.uploadError = null;
    this.selectedFile = file;
    // Plik przeszedł walidację - rozpocznij upload i animację skanowania
    this.analyzeCV(file);
  }

  // Wysyła plik CV do API i zarządza animacją postępu skanowania.
  // Backend (POST /v1/cv/analyze) nie zwraca postępu w czasie rzeczywistym,
  // dlatego animacja jest "fałszywa" - setTimeout skacze do 35% po 200ms
  // żeby użytkownik widział że coś się dzieje, a nie patrzył na pasek w 0%.
  // 150ms opóźnienie po odpowiedzi API daje czas na wyświetlenie "100% Zakończono!"
  // zanim UI zmieni się na baner sukcesu
  private analyzeCV(file: File): void {
    this.isScanning = true; this.scanProgress = 0; this.scanStatus = 'Analiza CV...';
    // Timer 1: po 200ms przeskakuje do 35% - sygnalizuje że API pracuje
    this.scanTimers.push(setTimeout(() => { this.scanProgress = 35; this.cdr.markForCheck(); }, 200));

    // Wysłanie pliku do backendu - CvApiService.uploadCv() zwraca Observable<LookupDto[]>
    // takeUntil(destroy$) - anuluje request gdy użytkownik nawiguje poza /home
    this.cvApi.uploadCv(file).pipe(takeUntil(this.destroy$)).subscribe({
      next: (techs) => {
        // API odpowiedziało sukcesem - ustawienie 100% i czekanie 150ms żeby użytkownik to zobaczył
        this.scanProgress = 100; this.scanStatus = 'Zakończono!';
        // Mapowanie odpowiedzi API (LookupDto[]) na LocationItem[] { id, name }
        // potrzebny format dla TechPickera - patrz: tech-picker.component.ts
        const selectedTechnologies = techs.map(t => ({ id: t.id, name: t.name }));
        // Timer 2: po 150ms przełącza UI na baner sukcesu i wstrzykuje technologie do formularza
        this.scanTimers.push(setTimeout(() => {
          this.isScanning = false;
          this.scanComplete = true;
          // Programatyczne ustawienie technologii wykrytych przez AI w FiltersFormComponent
          this.filtersFormRef?.patchValue({ selectedTechnologies });
          // Zapis do localStorage żeby nowe technologie przeżyły nawigację do /offers
          this.autoFillForm();
          this.cdr.markForCheck();
        }, 150));
      },
      error: () => {
        // Błąd API - ustawienie 100% i komunikatu błędu, potem reset UI
        this.scanProgress = 100; this.scanStatus = 'Nie udało się przeanalizować CV';
        this.scanTimers.push(setTimeout(() => {
          this.isScanning = false;
          this.scanComplete = false;
          // Usunięcie pliku - użytkownik musi spróbować ponownie
          this.selectedFile = null;
          this.cdr.markForCheck();
        }, 150));
      },
    });
  }

  // Handlery drag&drop dla dropzony CV.
  // e.preventDefault() w onDragOver JEST KONIECZNE - bez tego przeglądarka ignoruje (drop).
  // Zachowanie domyślne przeglądarki: otwórz plik bezpośrednio - preventDefault blokuje to.
  // isDragging kontroluje klasę CSS .dragging na dropzonie (wizualne podświetlenie)
  onDragOver(e: DragEvent): void { e.preventDefault(); this.isDragging = true; }
  onDragLeave(e: DragEvent): void { e.preventDefault(); this.isDragging = false; }
  onDrop(e: DragEvent): void {
    e.preventDefault(); this.isDragging = false;
    // dataTransfer?.files[0] - pierwszy upuszczony plik (obsługujemy tylko jeden)
    if (e.dataTransfer?.files.length) this.handleFile(e.dataTransfer.files[0]);
  }

  // Handler dla natywnego <input type="file"> (ukryty, wyzwalany kliknięciem dropzony).
  // e.target as HTMLInputElement - TypeScript nie zna dokładnego typu EventTarget
  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) this.handleFile(input.files[0]);
  }

  // Getter delegowany do AuthService - zwraca funkcję isAuthenticated z Keycloak.
  // Getter (a nie właściwość) bo authService.isAuthenticated to funkcja, nie wartość boolean.
  // Używany w szablonie: *ngIf="isAuthenticated()" do warunkowego pokazania "Uzupełnij z profilu"
  get isAuthenticated() { return this.authService.isAuthenticated; }
}
