// Strona /legal - dwie zakładki: "Jak korzystać" i "Regulamin".
// Odczytuje aktywną zakładkę z query param ?tab= i synchronizuje URL przez replaceUrl.
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';
import { NavbarComponent } from '../../app/shared/navbar/navbar.component';
import { FooterComponent } from '../../app/shared/footer/footer.component';

@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './legal.component.html',
  styleUrls: ['./legal.component.css'],
})
export class LegalComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  activeTab: 'how' | 'terms' = 'how';

  // snapshot zamiast subskrypcji - zakładka nie zmienia się przez nawigację,
  // bo setTab() używa replaceUrl (nie tworzy nowego wpisu w historii)
  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'how') {
      this.activeTab = 'how';
    } else if (tab === 'terms') {
      this.activeTab = 'terms';
    }
  }

  // replaceUrl: true - "Wstecz" wraca do poprzedniej strony, nie do poprzedniej zakładki
  setTab(tab: 'how' | 'terms'): void {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      replaceUrl: true,
    });
  }

  // Dane statyczne trzymane w klasie (nie w HTML) żeby łatwo dodawać/usuwać pozycje
  readonly steps = [
    { number: '01', icon: '🎛️', title: 'Ustaw filtry preferencji', desc: 'Wybierz interesujące Cię role, poziom doświadczenia, technologie, lokalizację, tryb pracy i widełki płacowe. Filtry działają w czasie rzeczywistym.' },
    { number: '02', icon: '📄', title: 'Wgraj CV (wymaga konta)', desc: 'Prześlij plik PDF, DOC lub DOCX — backend wyciągnie z niego technologie i automatycznie uzupełni je w filtrach. Funkcja dostępna po zalogowaniu.' },
    { number: '03', icon: '💼', title: 'Przeglądaj oferty', desc: 'Zalogowani użytkownicy widzą oferty ze wszystkich portali (Pracuj.pl, JustJoin.it, NoFluffJobs i innych). Goście mają dostęp tylko do Pracuj.pl.' },
    { number: '04', icon: '🚀', title: 'Otwórz ofertę u źródła', desc: 'Kliknięcie "Otwórz ofertę" przenosi Cię na oryginalną stronę ogłoszenia, gdzie możesz aplikować bezpośrednio u pracodawcy.' },
  ];

  readonly features = [
    { icon: '⚡', title: 'Filtry w czasie rzeczywistym', desc: 'Wybór roli, technologii, lokalizacji czy widełek aktualizuje listę ofert natychmiast — bez przeładowania.' },
    { icon: '📄', title: 'Skaner CV', desc: 'Wgrane CV jest analizowane przez backend, który wyciąga z niego technologie i wstawia do filtrów. Wymaga konta.' },
    { icon: '🔒', title: 'Logowanie przez Keycloak', desc: 'Pełne OAuth2 / PKCE, brak haseł trzymanych w naszej bazie. Tokeny odświeżają się automatycznie.' },
    { icon: '🎯', title: 'Dużo wymiarów filtrowania', desc: 'Specjalizacja, seniority, technologie (multi-select z autocomplete), lokalizacja, tryb pracy, widełki płacowe.' },
    { icon: '🧑‍💻', title: 'Konto odblokowuje więcej', desc: 'Goście widzą oferty tylko z Pracuj.pl. Po zalogowaniu dostępne są wszystkie portale, skaner CV i możliwość zapisania profilu z preferencjami.' },
    { icon: '📱', title: 'Responsive design', desc: 'Dashboard z resizable sidebarem na desktopie, składany layout na mobilce.' },
  ];

  readonly faq = [
    { q: 'Czy korzystanie z serwisu jest bezpłatne?', a: 'Tak — serwis jest w pełni darmowy, bez ukrytych opłat.' },
    { q: 'Skąd pochodzą oferty?', a: 'Agregujemy oferty z popularnych portali pracy IT (Pracuj.pl, JustJoin.it, NoFluffJobs i innych). Lista źródeł jest stale rozszerzana.' },
    { q: 'Co dokładnie robi się z moim CV?', a: 'Plik jest wysyłany do backendu, który wyciąga z niego nazwy technologii i odsyła je do frontu. Po zapisaniu profilu sam plik nie jest przechowywany.' },
    { q: 'Czy moje CV jest widoczne dla pracodawców?', a: 'Nie. CV nie trafia do nikogo poza Tobą — pracodawcy widzą Cię dopiero gdy sam zaaplikujesz.' },
    { q: 'Czy mogę korzystać bez konta?', a: 'Tak, ale z ograniczeniami — goście widzą oferty tylko z Pracuj.pl. Po zalogowaniu dostępne są wszystkie portale, skaner CV i zapis profilu.' },
    { q: 'Jak często pojawiają się nowe oferty?', a: 'Oferty są regularnie aktualizowane i od razu widoczne na liście.' },
  ];

  // null gdy żadne pytanie nie jest otwarte - wzorzec "jeden otwarty naraz"
  expandedFaq: number | null = null;

  toggleFaq(index: number): void {
    this.expandedFaq = this.expandedFaq === index ? null : index;
  }
}
