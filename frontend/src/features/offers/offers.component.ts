// Komponent strony /offers - lista ofert pracy z filtrami, wyszukiwarką i nieskończonym scrollem.
// Dane o ofertach pobierane są z backendu przez JobOffersApiService (core/services/job-offers-api.service.ts).
// Filtry obsługuje FiltersFormComponent (shared/filters-form/filters-form.component.ts).
// Typy FiltersValue i FiltersInitialState zdefiniowane są w shared/filters-form/filters-form.types.ts.
import { ChangeDetectorRef, Component, OnInit, OnDestroy, PLATFORM_ID, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, skip } from 'rxjs/operators';

import { FiltersFormComponent, MAX_SALARY_INDEX } from '../../app/shared/filters-form/filters-form.component';
import { FiltersInitialState, FiltersValue, FILTERS_STORAGE_KEY } from '../../app/shared/filters-form/filters-form.types';
import { NavbarComponent } from '../../app/shared/navbar/navbar.component';
import {
  JobOffersApiService, MappedOffer,
} from '../../app/core/services/job-offers-api.service';
import { AuthService } from '../auth/auth.service';
import { UserApiService } from '../../app/core/services/user-api.service';

// Górna granica suwaka wynagrodzenia w złotówkach (musi być zgodna z wartością w filters-form.component.ts)
const MAX_SALARY = 50000;

// OfferViewModel rozszerza MappedOffer (z job-offers-api.service.ts) o dwa dodatkowe pola
// obliczane lokalnie - matchedTech i matchedRoles są potrzebne tylko w widoku listy ofert
// do wyświetlania badge'y "dopasowane technologie / role" na kartach ofert
interface OfferViewModel extends MappedOffer {
  matchedTech: string[];  // klucze technologii z oferty, które użytkownik zaznaczył w filtrach
  matchedRoles: string[]; // klucze ról z oferty, które użytkownik zaznaczył w filtrach
}

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FiltersFormComponent, NavbarComponent],
  templateUrl: './offers.component.html',
  styleUrls: ['./offers.component.css'],
})
export class OffersComponent implements OnInit, OnDestroy {
  // Router i ActivatedRoute - do czytania parametrów URL i nawigacji bez przeładowania strony
  private readonly router      = inject(Router);
  private readonly route       = inject(ActivatedRoute);
  // PLATFORM_ID - pozwala sprawdzić czy kod działa w przeglądarce czy podczas SSR (server-side rendering)
  // Wiele rzeczy (localStorage, IntersectionObserver, window) istnieje tylko w przeglądarce
  private readonly platformId  = inject(PLATFORM_ID);
  // JobOffersApiService - pobiera oferty z backendu GET /v1/job-offers/get_offer_filter
  private readonly jobOffersApi = inject(JobOffersApiService);
  // ChangeDetectorRef - ręczne wymuszenie odświeżenia widoku (komponent używa OnPush)
  private readonly cdr         = inject(ChangeDetectorRef);
  // AuthService - sprawdzanie czy użytkownik jest zalogowany przez Keycloak
  private readonly authService = inject(AuthService);
  // UserApiService - pobieranie profilu zalogowanego użytkownika z GET /v1/users/me/profile
  private readonly userApi     = inject(UserApiService);

  // filtersFormRef - referencja do komponentu FiltersFormComponent w szablonie
  // Używana do wywołania metod computeValue() i patchValue() na formularzu filtrów
  @ViewChild(FiltersFormComponent) filtersFormRef?: FiltersFormComponent;
  // mainScrollRef - referencja do głównego kontenera ze scrollem w szablonie (#mainScroll)
  // Przekazywana do IntersectionObserver jako root (obszar obserwowania)
  @ViewChild('mainScroll') private mainScrollRef?: ElementRef<HTMLElement>;

  // destroy$ - Subject używany do anulowania wszystkich subskrypcji RxJS gdy komponent jest niszczony.
  // Każda subskrypcja ma .pipe(takeUntil(this.destroy$)) - gdy destroy$.next() zostanie wywołane,
  // wszystkie subskrypcje automatycznie się kończą i nie ma wycieków pamięci
  private readonly destroy$        = new Subject<void>();
  // filtersTrigger$ - emituje nowe filtry gdy użytkownik cokolwiek zmieni w formularzu.
  // Ma debounce 700ms - nie wysyłamy requestu do API przy każdym kliknięciu checkboxa
  private readonly filtersTrigger$ = new Subject<FiltersValue>();
  // searchTrigger$ - osobny Subject tylko dla pola wyszukiwania tytułu oferty.
  // Ma krótszy debounce (500ms) niż filtersTrigger$ bo wyszukiwanie powinno reagować szybciej
  private readonly searchTrigger$  = new Subject<string>();
  // intersectionObserver - obserwuje element sentinel na końcu listy i wywołuje loadMore()
  // gdy sentinel wchodzi w pole widzenia (tzw. infinite scroll)
  private intersectionObserver?: IntersectionObserver;
  // sentinelEl - referencja do aktualnie obserwowanego elementu sentinel (div na końcu listy)
  private sentinelEl?: HTMLElement;

  // scrollSentinel używa settera zamiast @ViewChild() z ngAfterViewInit, bo element #scrollSentinel
  // pojawia się i znika dynamicznie w szablonie (np. znika gdy oferty się ładują lub lista jest pusta).
  // Setter jest wywoływany przez Angulara za każdym razem gdy element pojawia się lub znika z DOM,
  // dzięki czemu IntersectionObserver jest zawsze podpięty pod aktualny element.
  @ViewChild('scrollSentinel')
  set scrollSentinel(el: ElementRef | undefined) {
    // Jeśli element nie zmienił się, nie robimy nic (guard przed niepotrzebnym rebindowaniem)
    if (el?.nativeElement === this.sentinelEl) return;
    // Rozłączamy poprzedni observer przed podpięciem nowego
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = undefined;
    this.sentinelEl = el?.nativeElement;
    if (this.sentinelEl && isPlatformBrowser(this.platformId)) {
      // IntersectionObserver wykrywa moment gdy element sentinel (niewidoczny div na dole listy)
      // pojawia się w obszarze widocznym - wtedy wywołuje loadMore() i ładuje kolejną stronę ofert
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) this.loadMore();
        },
        {
          root: this.mainScrollRef?.nativeElement ?? null, // obszar obserwowania = kontener listy
          rootMargin: '200px', // ładuj kolejną stronę 200px zanim użytkownik dotrze do końca
          threshold: 0,        // reaguj gdy choć 1 piksel sentinela jest widoczny
        }
      );
      this.intersectionObserver.observe(this.sentinelEl);
    }
  }

  // Flaga widoczności panelu filtrów - przełączana przyciskiem w szablonie (pokazuje/ukrywa sidebar)
  isFiltersVisible = true;

  // Klucze i wymiary sidebara z filtrami (panel po lewej stronie listy ofert).
  // Szerokość sidebara można zmieniać przeciągając uchwyt między sidebarem a listą ofert.
  // SIDEBAR_KEY - nazwa klucza w localStorage gdzie zapamiętujemy ostatnią szerokość
  private readonly SIDEBAR_KEY     = 'cv_offers_sidebar_width';
  // Minimalna i maksymalna szerokość sidebara w pikselach - ogranicza przeciąganie
  private readonly SIDEBAR_MIN     = 240;
  private readonly SIDEBAR_MAX     = 480;
  // Domyślna szerokość sidebara używana przy pierwszym wejściu (zanim użytkownik zmieni)
  private readonly SIDEBAR_DEFAULT = 340;

  // Aktualna szerokość sidebara w pikselach - bindowana do [style.width] w szablonie
  sidebarWidth      = this.SIDEBAR_DEFAULT;
  // Flaga informująca czy użytkownik aktualnie przeciąga uchwyt sidebara
  // (używana w szablonie do dodania klasy CSS podczas przeciągania)
  isSidebarDragging = false;

  // Pozycja X kursora i szerokość sidebara w momencie kliknięcia uchwytu drag -
  // potrzebne do obliczenia o ile zmienić szerokość podczas przesuwania myszy
  private dragStartX     = 0;
  private dragStartWidth = 0;
  // bind() tworzy stałe referencje do metod onDragMove i onDragEnd przypisane do tej instancji klasy.
  // Jest to konieczne ponieważ addEventListener i removeEventListener muszą otrzymać
  // identyczną referencję funkcji - bez bind() każde wywołanie .bind() tworzyłoby nową referencję
  // i removeEventListener nie mógłby znaleźć właściwego listenera do usunięcia
  private readonly boundMove = this.onDragMove.bind(this);
  private readonly boundEnd  = this.onDragEnd.bind(this);

  onDragStart(event: MouseEvent): void {
    event.preventDefault(); // blokuje domyślne zaznaczanie tekstu podczas przeciągania
    this.isSidebarDragging = true;
    this.dragStartX     = event.clientX;
    this.dragStartWidth = this.sidebarWidth;
    // Listenery dodajemy na document (nie na element), żeby drag działał nawet gdy kursor
    // opuści obszar uchwytu lub wyjdzie poza okno przeglądarki podczas szybkiego ruchu
    document.addEventListener('mousemove', this.boundMove);
    document.addEventListener('mouseup',   this.boundEnd);
    document.body.style.cursor     = 'col-resize'; // kursor zmieniamy globalnie podczas dragu
    document.body.style.userSelect = 'none';       // blokujemy zaznaczanie tekstu na stronie
  }

  private onDragMove(event: MouseEvent): void {
    if (!this.isSidebarDragging) return;
    // delta - o ile pikseli kursor przesunął się od momentu kliknięcia uchwytu
    const delta = event.clientX - this.dragStartX;
    // Nowa szerokość = startowa + delta, ale ograniczona do zakresu MIN-MAX
    this.sidebarWidth = Math.min(
      this.SIDEBAR_MAX,
      Math.max(this.SIDEBAR_MIN, this.dragStartWidth + delta)
    );
    this.cdr.markForCheck(); // wymuszamy odświeżenie widoku bo sidebar jest aktualizowany w CSS
  }

  private onDragEnd(): void {
    this.isSidebarDragging = false;
    // Usuwamy listenery z document - muszą to być identyczne referencje co przy addEventListener,
    // dlatego używamy boundMove i boundEnd zamiast nowych wywołań .bind()
    document.removeEventListener('mousemove', this.boundMove);
    document.removeEventListener('mouseup',   this.boundEnd);
    document.body.style.cursor     = ''; // przywracamy domyślny kursor
    document.body.style.userSelect = ''; // przywracamy możliwość zaznaczania tekstu
    // Zapamiętujemy nową szerokość w localStorage - będzie wczytana przy kolejnym wejściu na /offers
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.SIDEBAR_KEY, String(this.sidebarWidth));
    }
  }

  // Wczytuje zapisaną szerokość sidebara z localStorage.
  // Wywoływana raz w ngOnInit - przywraca ostatnio ustawioną szerokość przez użytkownika.
  private loadSidebarWidth(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const raw = localStorage.getItem(this.SIDEBAR_KEY);
    if (raw) {
      const parsed = parseInt(raw, 10);
      // Clampujemy do MIN-MAX na wypadek gdyby stałe zmieniły się od poprzedniej wizyty
      if (!isNaN(parsed)) {
        this.sidebarWidth = Math.min(this.SIDEBAR_MAX, Math.max(this.SIDEBAR_MIN, parsed));
      }
    }
  }

  // initialFilters - stan formularza przekazywany do FiltersFormComponent przy pierwszym renderze.
  // Typ FiltersInitialState (z filters-form.types.ts) - częściowy obiekt z opcjonalnymi polami,
  // bo nie zawsze mamy zapisane wszystkie filtry (np. pierwsze wejście = pusty obiekt {})
  initialFilters: FiltersInitialState | null = null;
  // currentFilters - aktualny pełny stan formularza po każdej zmianie przez użytkownika.
  // Typ FiltersValue (z filters-form.types.ts) - kompletny obiekt ze wszystkimi polami,
  // gotowy do wysłania jako parametry do API
  currentFilters: FiltersValue | null = null;
  // allOffers - wszystkie oferty pobrane z backendu, akumulowane przy kolejnych stronach (infinite scroll).
  // Surowe dane z API po zmapowaniu przez jobOffersApi.mapToOffer() na interfejs MappedOffer
  allOffers: MappedOffer[] = [];
  // matchedOffers - przefiltrowane klient-side oferty wzbogacone o matchedTech i matchedRoles.
  // To właśnie ta tablica jest wyświetlana w szablonie przez *ngFor
  matchedOffers: OfferViewModel[] = [];

  // searchQuery - aktualny tekst wpisany w pole wyszukiwarki (filtrowanie po tytule oferty)
  searchQuery  = '';
  // searchFocused - flaga czy pole wyszukiwarki jest aktywne (używana w szablonie do stylowania)
  searchFocused = false;

  // isLoading - true podczas ładowania pierwszej strony ofert (wyświetla główny spinner/skeleton)
  isLoading     = false;
  // isLoadingMore - true podczas ładowania kolejnych stron (wyświetla mały spinner na dole listy)
  isLoadingMore = false;
  // loadError - komunikat błędu gdy request do API się nie powiódł (null gdy brak błędu)
  loadError: string | null = null;

  // pageSize - liczba ofert pobieranych w jednym zapytaniu do API (parametry skip/limit)
  readonly pageSize = 20;
  // currentPage - numer aktualnie załadowanej strony (0 = pierwsza)
  currentPage = 0;
  // hasMore - false gdy ostatni response API zwrócił mniej rekordów niż pageSize,
  // co oznacza że nie ma więcej stron do załadowania
  hasMore     = true;

  // Getter przekazujący stan zalogowania z AuthService (Keycloak) do szablonu
  get isAuthenticated() { return this.authService.isAuthenticated; }

  ngOnInit(): void {
    // Cały komponent wymaga przeglądarki (localStorage, IntersectionObserver, history.state)
    // Podczas SSR (server-side rendering) komponent nie inicjalizuje się
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadSidebarWidth();

    // Subskrypcja zdarzeń routera - wymusza odświeżenie widoku przy każdej nawigacji.
    // Potrzebne bo np. navbar sprawdza auth.isAuthenticated i musi wiedzieć o zmianie stanu
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.cdr.markForCheck();
    });

    // filtersTrigger$ obsługuje zmiany filtrów z opóźnieniem (debounce 700ms).
    // skip(1) pomija pierwszą emisję - pierwsze załadowanie ofert uruchamia onFiltersReady(),
    // a nie ta subskrypcja. Bez skip(1) nastąpiłoby podwójne ładowanie przy starcie strony.
    this.filtersTrigger$.pipe(
      skip(1),
      debounceTime(700),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.updateUrl(value);    // zaktualizuj URL żeby można skopiować link z filtrami
      this.resetAndLoad(value); // załaduj oferty od nowa z nowymi filtrami
    });

    // searchTrigger$ obsługuje wpisywanie w wyszukiwarkę z debounce 500ms.
    // Osobny Subject niż filtry - inne opóźnienie i nie aktualizuje URL przy każdym znaku
    this.searchTrigger$.pipe(
      debounceTime(500),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.currentFilters) this.resetAndLoad(this.currentFilters);
    });

    // Subskrypcja queryParamMap - odczytuje filtry z URL przy wejściu na stronę.
    // Priorytety źródła filtrów (od najwyższego):
    //   1. Parametry URL (?roles=...&tech=...) - gdy użytkownik wchodzi przez udostępniony link
    //   2. history.state.filters - gdy użytkownik przechodzi z home przez router.navigate()
    //   3. localStorage (klucz FILTERS_STORAGE_KEY) - ostatnio zapisane filtry z home lub offers
    //   4. Pusty obiekt {} - pierwsze wejście, brak zapisanych danych
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        // initialFilters ustawiamy tylko raz - ignorujemy kolejne emisje (np. po updateUrl)
        if (this.initialFilters) return;

        const urlFilters = this.urlToFilters(params);
        if (urlFilters) {
          this.initialFilters = urlFilters;
          return;
        }

        // history.state.filters - przekazywane przez home.component.ts przez router.navigate(['/offers'], { state: { filters } })
        const navState = history.state as { filters?: FiltersInitialState };
        const stateFilters = navState?.filters;
        const filters = stateFilters ?? this.loadSavedFilters() ?? {};

        this.initialFilters = filters;
      });
  }

  // Aktualizuje parametry URL bez przeładowania strony i bez dodawania nowego wpisu w historii.
  // Dzięki temu użytkownik może skopiować URL i udostępnić link z aktualnymi filtrami.
  // replaceUrl: true - zastępuje bieżący wpis w historii przeglądarki zamiast dodawać nowy
  private updateUrl(value: FiltersValue): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.buildQueryParams(value),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  // Tworzy obiekt parametrów URL z aktualnych filtrów.
  // Używa skróconych kluczy (roles, wm, loc zamiast pełnych nazw) żeby URL był krótki.
  // null oznacza "usuń ten parametr z URL" gdy filtr nie jest aktywny.
  // salFrom i salTo to indeksy suwaka (nie kwoty PLN) - tak samo jak FiltersValue z filters-form.types.ts
  private buildQueryParams(value: FiltersValue): Record<string, string[] | string | null> {
    return {
      roles:     value.specializationIds.length ? value.specializationIds : null,
      seniority: value.expLevelIds.length       ? value.expLevelIds       : null,
      wm:        value.workTypeIds.length        ? value.workTypeIds        : null,  // wm = work mode (tryb pracy)
      sites:     value.siteIds.length            ? value.siteIds            : null,
      loc:       value.locationIds.length        ? value.locationIds        : null,
      tech:      value.technologyIds.length      ? value.technologyIds      : null,
      salFrom:   value.salaryFromIndex > 0              ? String(value.salaryFromIndex) : null,
      salTo:     value.salaryToIndex < MAX_SALARY_INDEX ? String(value.salaryToIndex)   : null,
    };
  }

  // Parsuje parametry z URL z powrotem na FiltersInitialState (typ z filters-form.types.ts).
  // Jest to operacja odwrotna do buildQueryParams - czytamy URL i odtwarzamy stan filtrów.
  // Zwraca null gdy URL nie zawiera żadnych znanych kluczy filtrów (np. wejście bezpośrednie na /offers)
  private urlToFilters(params: ParamMap): FiltersInitialState | null {
    const knownKeys = ['roles', 'seniority', 'wm', 'sites', 'loc', 'tech', 'salFrom', 'salTo'];
    if (!knownKeys.some(k => params.has(k))) return null;

    // getIds obsługuje zarówno ?tech=a&tech=b (wiele parametrów o tej samej nazwie)
    // jak i ?tech=a,b (wartości rozdzielone przecinkiem) - dla kompatybilności z różnymi formatami URL
    const getIds = (key: string): string[] =>
      params.getAll(key).flatMap(v => v.split(',').filter(Boolean));

    const result: FiltersInitialState = {};

    // Pola itArea i seniority w FiltersInitialState są obiektami { id: true } a nie tablicami,
    // dlatego konwertujemy tablicę ID na obiekt przez Object.fromEntries
    const roles = getIds('roles');
    if (roles.length) result.itArea = Object.fromEntries(roles.map(id => [id, true]));

    const seniority = getIds('seniority');
    if (seniority.length) result.seniority = Object.fromEntries(seniority.map(id => [id, true]));

    const wm = getIds('wm');
    if (wm.length) result.workModeIds = wm;

    const sites = getIds('sites');
    if (sites.length) result.jobSiteKeys = sites;

    const loc = getIds('loc');
    if (loc.length) result.locationIds = loc;

    const tech = getIds('tech');
    if (tech.length) result.technologies = Object.fromEntries(tech.map(id => [id, true]));

    // salFrom i salTo to indeksy suwaka salary (nie kwoty PLN) - FiltersForm przelicza je na PLN
    const salFrom = params.get('salFrom');
    if (salFrom != null) result.salaryFromIndex = +salFrom;
    const salTo = params.get('salTo');
    if (salTo != null) result.salaryToIndex = +salTo;

    return result;
  }

  // Odczytuje ostatnio zapisane filtry z localStorage.
  // Klucz FILTERS_STORAGE_KEY jest współdzielony z home.component.ts i profile.component.ts -
  // dzięki temu filtry ustawione na stronie głównej są dostępne na stronie ofert i odwrotnie
  private loadSavedFilters(): FiltersInitialState | null {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  // onFiltersReady - wywoływane JEDEN raz przez FiltersFormComponent przez (filtersReady) w szablonie,
  // gdy formularz filtrów zakończy inicjalizację i jest gotowy do pracy.
  // To zdarzenie uruchamia pierwsze ładowanie ofert z backendu
  onFiltersReady(value: FiltersValue): void {
    this.currentFilters = value;
    this.updateUrl(value);    // ustaw URL zgodny z początkowymi filtrami
    this.resetAndLoad(value); // załaduj pierwsze oferty
  }

  // onFiltersChange - wywoływane przez FiltersFormComponent przez (filtersChange) w szablonie
  // przy KAŻDEJ zmianie filtrów przez użytkownika (kliknięcie checkboxa, zmiana suwaka itp.).
  // Natychmiast przelicza matchedOffers (filtrowanie po stronie klienta, bez requestu do API),
  // a do API wysyła request dopiero po 700ms debounce przez filtersTrigger$
  onFiltersChange(value: FiltersValue): void {
    this.currentFilters = value;
    this.matchedOffers  = this.computeMatchedOffers(); // natychmiastowe przeliczenie w przeglądarce
    this.filtersTrigger$.next(value);                  // opóźniony request do API (debounce 700ms)
  }

  ngOnDestroy(): void {
    // Anulujemy wszystkie subskrypcje RxJS - destroy$.next() powoduje zakończenie takeUntil we wszystkich pipe'ach
    this.destroy$.next();
    this.destroy$.complete();
    // Rozłączamy IntersectionObserver - bez tego obserwuje elementy które już nie istnieją (wyciek pamięci)
    this.intersectionObserver?.disconnect();
    // Usuwamy globalne listenery z document - konieczne gdy użytkownik nawiguje podczas dragu sidebara
    document.removeEventListener('mousemove', this.boundMove);
    document.removeEventListener('mouseup',   this.boundEnd);
  }

  // Ładuje kolejną stronę ofert z backendu.
  // Wywoływane automatycznie przez IntersectionObserver gdy sentinel wejdzie w pole widzenia,
  // lub ręcznie przez przycisk "Załaduj więcej" w szablonie (jako fallback gdy observer nie działa)
  loadMore(): void {
    if (!this.currentFilters || !this.hasMore || this.isLoadingMore || this.isLoading) return;
    this.loadOffersFromApi(this.currentFilters, this.currentPage + 1);
  }

  // Resetuje paginację do strony 0 i czyści listę ofert, potem ładuje od nowa.
  // Wywoływane gdy filtry lub wyszukiwanie się zmieniają - nowe kryteria = nowa lista od początku
  private resetAndLoad(value: FiltersValue): void {
    this.currentPage  = 0;
    this.hasMore      = true;
    this.allOffers    = [];
    this.matchedOffers = [];
    this.loadOffersFromApi(value, 0);
  }

  // Wykonuje request do backendu GET /v1/job-offers/get_offer_filter z aktualnymi filtrami i stroną.
  // Obsługuje dwa tryby ładowania: pierwsza strona (isLoading) i kolejne strony (isLoadingMore)
  private loadOffersFromApi(value: FiltersValue, page: number): void {
    const isFirstPage = page === 0;
    // Pierwsze ładowanie pokazuje główny spinner (zasłania całą listę),
    // kolejne strony pokazują tylko mały spinner na dole (lista pozostaje widoczna)
    if (isFirstPage) {
      this.isLoading = true;
    } else {
      this.isLoadingMore = true;
    }
    this.loadError = null;

    // Budujemy parametry requestu - skip/limit do paginacji, reszta to filtry użytkownika.
    // Typ Parameters<...>[0] automatycznie pobiera typ pierwszego argumentu metody getOffers()
    const params: Parameters<typeof this.jobOffersApi.getOffers>[0] = {
      skip:  page * this.pageSize, // ile rekordów pominąć (np. strona 2 = skip 20)
      limit: this.pageSize,        // ile rekordów pobrać (zawsze 20)
    };
    // Wysyłamy parametr filtra tylko gdy jest aktywny - puste tablice lub wartości domyślne pomijamy.
    // Backend ignoruje brakujące parametry (traktuje jako "brak filtra")
    if (value.expLevelIds.length > 0)      params.exp_level_ids     = value.expLevelIds;
    if (value.specializationIds.length > 0) params.specialization_ids = value.specializationIds;
    if (value.technologyIds.length > 0)     params.technology_ids    = value.technologyIds;
    if (value.siteIds.length > 0)           params.site_ids          = value.siteIds;
    if (value.locationIds.length > 0)       params.location_ids      = value.locationIds;
    if (value.workTypeIds.length > 0)       params.work_type_ids     = value.workTypeIds;
    if (value.salaryFrom > 0)               params.salary_from_min   = value.salaryFrom;
    if (value.salaryTo < MAX_SALARY)        params.salary_to_max     = value.salaryTo;
    // Wyszukiwanie po tytule oferty - wysyłamy tylko gdy użytkownik coś wpisał
    const q = this.searchQuery.trim();
    if (q) params.title = q;

    this.jobOffersApi.getOffers(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (apiOffers) => {
        // Konwertujemy surową odpowiedź API na MappedOffer przez jobOffersApi.mapToOffer()
        // (mapowanie obsługuje wartości null i string 'None' zwracane przez Python/FastAPI)
        const mapped = apiOffers.map(o => this.jobOffersApi.mapToOffer(o) as MappedOffer);
        const sorted = this.sortBatch(mapped);
        // Pierwsza strona zastępuje całą listę, kolejne strony są doklejane na koniec
        this.allOffers    = isFirstPage ? sorted : [...this.allOffers, ...sorted];
        this.currentPage  = page;
        // Gdy API zwróciło mniej rekordów niż pageSize, to był ostatnia strona - brak kolejnych
        this.hasMore      = apiOffers.length === this.pageSize;
        this.matchedOffers = this.computeMatchedOffers();
        this.isLoading     = false;
        this.isLoadingMore = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        // status 0 oznacza brak połączenia z serwerem (CORS error lub backend nie działa)
        this.loadError = err.status === 0
          ? 'Brak połączenia z serwerem. Sprawdź czy backend jest uruchomiony.'
          : `Nie udało się załadować ofert (błąd ${err.status}).`;
        this.isLoading     = false;
        this.isLoadingMore = false;
        this.cdr.markForCheck();
      },
    });
  }

  // Sortuje wsad ofert przed dodaniem do allOffers.
  // Logika sortowania: najpierw oferty z podanym wynagrodzeniem (salaryMax > 0), malejąco po salaryMax.
  // Oferty bez wynagrodzenia są na końcu, posortowane alfabetycznie po tytule (locale 'pl')
  private sortBatch(offers: MappedOffer[]): MappedOffer[] {
    return [...offers].sort((a, b) => {
      const aHas = a.salaryMax > 0;
      const bHas = b.salaryMax > 0;
      if (aHas && !bHas) return -1;  // a ma salary, b nie - a idzie wyżej
      if (!aHas && bHas) return 1;   // b ma salary, a nie - b idzie wyżej
      if (aHas && bHas && a.salaryMax !== b.salaryMax) return b.salaryMax - a.salaryMax; // wyższe salary wyżej
      return a.title.localeCompare(b.title, 'pl'); // alfabetycznie dla równych
    });
  }

  // Przelicza matchedOffers na podstawie allOffers i currentFilters.
  // Wykonuje filtrowanie po stronie klienta (salary range) i wzbogaca oferty o matchedTech/matchedRoles.
  // Wywoływana przy każdej zmianie filtrów i po każdym załadowaniu nowej strony z backendu
  private computeMatchedOffers(): OfferViewModel[] {
    if (!this.currentFilters) return [];
    const filters = this.currentFilters;
    return this.allOffers
      .filter(offer => this.isSalaryInRange(offer, filters))
      .map(offer => this.toOfferViewModel(offer, filters));
  }

  // Sprawdza czy oferta mieści się w wybranym zakresie wynagrodzenia.
  // Oferty bez podanego wynagrodzenia (salaryMin === 0 i salaryMax === 0) zawsze przechodzą -
  // ukrywanie ich byłoby złym UX bo pracodawca po prostu nie ujawnił widełek, a oferta może być dobra
  private isSalaryInRange(offer: MappedOffer, filters: FiltersValue): boolean {
    if (offer.salaryMin === 0 && offer.salaryMax === 0) return true;
    return offer.salaryMax >= filters.salaryFrom && offer.salaryMin <= filters.salaryTo;
  }

  // Tworzy OfferViewModel z MappedOffer - rozszerza ofertę o matchedTech i matchedRoles.
  // matchedTech - które technologie z oferty użytkownik zaznaczył w filtrach (do badge'y w karcie)
  // matchedRoles - które role z oferty pasują do wybranych przez użytkownika specjalizacji
  private toOfferViewModel(offer: MappedOffer, filters: FiltersValue): OfferViewModel {
    const selectedRoles = this.selectedKeys(filters.itArea);
    const selectedTech  = this.selectedKeys(filters.technologies);
    const matchedRoles  = offer.roles.filter(role => selectedRoles.includes(role));
    const matchedTech   = offer.technologies.filter(tech => selectedTech.includes(tech));
    return { ...offer, matchedRoles, matchedTech };
  }

  // Pomocnicza - wyciąga klucze z obiektu { klucz: boolean } gdzie wartość === true.
  // Używana do odczytania zaznaczonych checkboxów z FormGroup (np. itArea, technologies)
  private selectedKeys(group: Record<string, boolean>): string[] {
    return Object.entries(group).filter(([, v]) => v).map(([k]) => k);
  }

  // Getter używany w szablonie przez *ngFor - zwraca matchedOffers (przefiltrowana lista do wyświetlenia)
  get displayedOffers(): OfferViewModel[] {
    return this.matchedOffers;
  }

  // trackBy dla *ngFor ofert - Angular używa ID oferty do identyfikacji elementów DOM.
  // Bez trackBy Angular niszczyłby i tworzył wszystkie elementy listy przy każdej zmianie,
  // co byłoby bardzo nieefektywne przy liście 20+ ofert
  trackOffer(_index: number, offer: OfferViewModel): string {
    return offer.id;
  }

  // trackBy dla *ngFor list stringów (np. lista technologii wyświetlana w karcie oferty)
  trackByString(_index: number, value: string): string {
    return value;
  }

  // Wywoływane z szablonu gdy użytkownik coś wpisuje w pole wyszukiwarki
  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.searchTrigger$.next(query); // debounce 500ms - request po 500ms od ostatniego znaku
  }

  // Wywoływane gdy użytkownik kliknie przycisk "X" przy wyszukiwarce - czyści zapytanie
  onSearchClear(): void {
    this.searchQuery = '';
    this.searchTrigger$.next('');
  }

  // Sprawdza czy oferta ma podane wynagrodzenie - używane w szablonie do warunkowego
  // wyświetlania sekcji z wynagrodzeniem (gdy brak danych wyświetlamy "Nie podano")
  hasSalary(offer: OfferViewModel): boolean {
    return offer.salaryMin > 0 || offer.salaryMax > 0;
  }

  // Otwiera ofertę na zewnętrznym portalu w nowej karcie przeglądarki.
  // noopener - nowa karta nie może manipulować oknem rodzica (window.opener)
  // noreferrer - nie wysyła nagłówka Referer do zewnętrznego serwisu (prywatność)
  openOffer(offer: OfferViewModel): void {
    if (offer.url && isPlatformBrowser(this.platformId)) {
      window.open(offer.url, '_blank', 'noopener,noreferrer');
    }
  }

  // Formatuje klucz roli (np. "backend_developer") na czytelną nazwę (np. "Backend Developer").
  // Delegujemy do FiltersFormComponent bo to on ma załadowane dane lookupów z backendu.
  // Jeśli filtersFormRef nie jest dostępny (SSR/test), zwracamy surowy klucz jako fallback
  formatRole(key: string): string {
    return this.filtersFormRef?.formatRole(key) ?? key;
  }

  // Formatuje klucz technologii (np. "typescript") na czytelną nazwę (np. "TypeScript")
  formatTech(key: string): string {
    return this.filtersFormRef?.formatTech(key) ?? key;
  }

  // Formatuje klucz portalu ogłoszeń (np. "pracuj") na czytelną nazwę (np. "Pracuj.pl")
  formatSource(source: string): string {
    return this.filtersFormRef?.availableSites.find(s => s.key === source)?.label ?? source;
  }

  // Zwraca etykietę trybu pracy (np. "hybrid") jako czytelną nazwę (np. "Hybrydowo")
  getWorkModeLabel(workTypeId: string): string {
    return this.filtersFormRef?.availableWorkTypes.find(w => w.id === workTypeId)?.label ?? workTypeId;
  }

  // Wypełnia filtry danymi z profilu zalogowanego użytkownika przez GET /v1/users/me/profile.
  // Nadpisuje tylko seniority i technologie - reszta filtrów (salary, lokalizacja, tryb pracy) zostaje bez zmian.
  // Spread zachowuje bieżące filtry i selektywnie nadpisuje tylko pola z profilu.
  async fillFromProfile(): Promise<void> {
    if (!this.isAuthenticated()) return;
    try {
      const profile = await this.userApi.getMyProfile();

      const selectedTechnologies = (profile.technologies ?? []).map((t: { id: string; name: string }) => ({
        id: t.id,
        name: t.name,
      }));
      const expLevelId = profile.exp_level?.id ?? '';

      // Zachowujemy aktualne filtry jako bazę i nadpisujemy tylko seniority i technologie.
      // technologies to obiekt { id: true } wymagany przez FiltersInitialState (z filters-form.types.ts)
      const nextFilters: FiltersInitialState = {
        ...(this.currentFilters ?? this.initialFilters ?? {}),
        selectedTechnologies,
        technologies: Object.fromEntries(selectedTechnologies.map((t: { id: string }) => [t.id, true])),
        seniority: expLevelId ? { [expLevelId]: true } : {},
      };

      this.initialFilters = nextFilters;
      this.currentFilters = this.filtersFormRef?.computeValue() ?? this.currentFilters;
      // patchValue() aktualizuje formularz filtrów - FiltersFormComponent przelicza wszystkie ID
      this.filtersFormRef?.patchValue(nextFilters);
    } catch (error) {
      console.error('Failed to fill filters from profile:', error);
    }
  }

}
