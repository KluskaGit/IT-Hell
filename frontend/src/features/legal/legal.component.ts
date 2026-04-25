import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../features/auth/auth.service';

@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [CommonModule, RouterModule],
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

  readonly steps = [
    {
      number: '01',
      icon: '👤',
      title: 'Utwórz profil',
      desc: 'Wypełnij preferencje zawodowe — specjalizację, seniority, technologie, oczekiwania płacowe i tryb pracy. Im dokładniejszy profil, tym trafniejsze dopasowania.',
    },
    {
      number: '02',
      icon: '📄',
      title: 'Prześlij swoje CV',
      desc: 'Wgraj plik PDF, DOC lub DOCX. Algorytm automatycznie wyciąga z niego umiejętności, doświadczenie i słowa kluczowe.',
    },
    {
      number: '03',
      icon: '🤖',
      title: 'AI dopasowuje oferty',
      desc: 'System porównuje Twój profil z tysiącami ofert pracy z portali takich jak Pracuj.pl. Każdej ofercie przypisywany jest procentowy wynik dopasowania (Match Score).',
    },
    {
      number: '04',
      icon: '🎯',
      title: 'Przeglądaj wyniki',
      desc: 'Lista ofert posortowana od najlepiej dopasowanych. Filtruj po technologiach, salary, trybie pracy i innych kryteriach w czasie rzeczywistym.',
    },
    {
      number: '05',
      icon: '🚀',
      title: 'Aplikuj jednym kliknięciem',
      desc: 'Kliknij "Aplikuj" przy wybranej ofercie — zostaniesz przekierowany bezpośrednio na stronę pracodawcy lub formularz aplikacyjny.',
    },
  ];

  readonly features = [
    { icon: '⚡', title: 'Real-time filtry', desc: 'Wyniki aktualizują się natychmiast po zmianie filtrów — bez przeładowania strony.' },
    { icon: '🔒', title: 'Bezpieczeństwo danych', desc: 'Uwierzytelnianie przez Keycloak. Twoje CV i dane profilu są zaszyfrowane w bazie danych.' },
    { icon: '🌍', title: 'Wiele portali', desc: 'Oferty agregowane z Pracuj.pl i kolejnych portali rekrutacyjnych (w trakcie rozbudowy).' },
    { icon: '📊', title: 'Match Score', desc: 'Autorski algorytm ocenia dopasowanie oferty do Twojego profilu w skali 0–100%.' },
    { icon: '🎛️', title: 'AI Precision Slider', desc: 'Reguluj próg dopasowania — od szerokiego wyszukiwania do precyzyjnych, idealnych ofert.' },
    { icon: '📱', title: 'Responsive design', desc: 'Pełne wsparcie dla urządzeń mobilnych i tabletów.' },
  ];

  readonly faq = [
    { q: 'Czy korzystanie z serwisu jest bezpłatne?', a: 'Tak, serwis CV_ANALIZER jest całkowicie bezpłatny dla użytkowników szukających pracy.' },
    { q: 'Jak obliczany jest Match Score?', a: 'Algorytm bierze pod uwagę: dopasowanie specjalizacji (30 pkt), seniority (25 pkt), technologii (30 pkt), rodzaju umowy (5 pkt) i widełek płacowych (10 pkt).' },
    { q: 'Czy moje CV jest widoczne dla pracodawców?', a: 'Nie. CV służy wyłącznie do analizy dopasowania po Twojej stronie. Nie udostępniamy go pracodawcom.' },
    { q: 'Jak często aktualizowane są oferty pracy?', a: 'Scraper pobiera nowe oferty regularnie — docelowo kilka razy dziennie.' },
    { q: 'Czy mogę korzystać z serwisu bez konta?', a: 'Tak — możesz przeglądać oferty jako gość po wypełnieniu formularza na stronie głównej. Konto wymagane jest do zapisu profilu i przesyłania CV.' },
  ];

  expandedFaq: number | null = null;

  toggleFaq(index: number): void {
    this.expandedFaq = this.expandedFaq === index ? null : index;
  }
}
