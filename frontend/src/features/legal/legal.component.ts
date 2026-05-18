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

  activeTab: 'how' | 'terms' | 'privacy' = 'how';

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'terms' || tab === 'privacy' || tab === 'how') {
      this.activeTab = tab;
    }
  }

  setTab(tab: 'how' | 'terms' | 'privacy'): void {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      replaceUrl: true,
    });
  }

  readonly steps = [
    { number: '01', icon: '🎛️', title: 'Ustaw filtry preferencji', desc: 'Wybierz interesujące Cię role, poziom doświadczenia, technologie, lokalizację, tryb pracy i widełki płacowe. Filtry działają w czasie rzeczywistym.' },
    { number: '02', icon: '📄', title: 'Wgraj CV (opcjonalnie)', desc: 'Prześlij plik PDF, DOC lub DOCX — backend wyciągnie z niego technologie i automatycznie uzupełni je w filtrach. Bez CV też zadziała.' },
    { number: '03', icon: '💼', title: 'Przeglądaj oferty', desc: 'Lista ofert z popularnych portali pracy ładuje się płynnie przez infinite scroll. Możesz zawęzić wyniki przez wyszukiwarkę po stanowisku, firmie lub lokalizacji.' },
    { number: '04', icon: '🚀', title: 'Otwórz ofertę u źródła', desc: 'Kliknięcie "Otwórz ofertę" przenosi Cię na oryginalną stronę ogłoszenia, gdzie możesz aplikować bezpośrednio u pracodawcy.' },
  ];

  readonly features = [
    { icon: '⚡', title: 'Filtry w czasie rzeczywistym', desc: 'Wybór roli, technologii, lokalizacji czy widełek aktualizuje listę ofert natychmiast — bez przeładowania.' },
    { icon: '📄', title: 'Skaner CV', desc: 'Wgrane CV jest analizowane przez backend, który wyciąga z niego technologie i wstawia do filtrów.' },
    { icon: '🔒', title: 'Logowanie przez Keycloak', desc: 'Pełne OAuth2 / PKCE, brak haseł trzymanych w naszej bazie. Tokeny odświeżają się automatycznie.' },
    { icon: '🎯', title: 'Dużo wymiarów filtrowania', desc: 'Specjalizacja, seniority, technologie (multi-select z autocomplete), lokalizacja, tryb pracy, widełki płacowe.' },
    { icon: '🧑‍💻', title: 'Tryb gościa', desc: 'Możesz przeglądać oferty bez zakładania konta — konto potrzebne tylko żeby zapisać profil i CV.' },
    { icon: '📱', title: 'Responsive design', desc: 'Dashboard z resizable sidebarem na desktopie, składany layout na mobilce.' },
  ];

  readonly faq = [
    { q: 'Czy korzystanie z serwisu jest bezpłatne?', a: 'Tak — pełna funkcjonalność serwisu jest darmowa, bez ukrytych opłat ani limitów.' },
    { q: 'Skąd pochodzą oferty?', a: 'Agregujemy oferty z popularnych portali pracy IT. Lista źródeł jest stale rozszerzana.' },
    { q: 'Co dokładnie robi się z moim CV?', a: 'Plik jest wysyłany do backendu, który wyciąga z niego nazwy technologii i odsyła je do frontu. Po zapisaniu profilu sam plik nie jest przechowywany.' },
    { q: 'Czy moje CV jest widoczne dla pracodawców?', a: 'Nie. CV nie trafia do nikogo poza Tobą — pracodawcy widzą Cię dopiero gdy sam zaaplikujesz.' },
    { q: 'Czy mogę korzystać bez konta?', a: 'Tak — strona ofert działa w pełni dla gości. Konto potrzebne tylko żeby zapisać profil.' },
    { q: 'Jak często pojawiają się nowe oferty?', a: 'Oferty są regularnie aktualizowane i od razu widoczne na liście.' },
  ];

  expandedFaq: number | null = null;

  toggleFaq(index: number): void {
    this.expandedFaq = this.expandedFaq === index ? null : index;
  }
}
