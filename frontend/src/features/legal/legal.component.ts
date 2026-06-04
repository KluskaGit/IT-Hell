// /legal page - two tabs: "How to use" and "Terms".
// Reads the active tab from the ?tab= query param and syncs the URL via replaceUrl.
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

  // snapshot instead of a subscription - the tab does not change through navigation,
  // because setTab() uses replaceUrl (it doesn't create a new history entry)
  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'how') {
      this.activeTab = 'how';
    } else if (tab === 'terms') {
      this.activeTab = 'terms';
    }
  }

  // replaceUrl: true - "Back" returns to the previous page, not the previous tab
  setTab(tab: 'how' | 'terms'): void {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      replaceUrl: true,
    });
  }

  // Static data kept in the class (not in HTML) to make adding/removing items easy
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

  // null when no question is open - the "one open at a time" pattern
  expandedFaq: number | null = null;

  toggleFaq(index: number): void {
    this.expandedFaq = this.expandedFaq === index ? null : index;
  }
}
