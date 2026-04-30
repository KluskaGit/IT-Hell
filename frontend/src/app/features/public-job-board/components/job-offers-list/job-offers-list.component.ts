import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfferCardComponent } from '../../../../shared/components/offer-card/offer-card.component';
import { JobBoardService } from '../../services/job-board.service';

@Component({
  selector: 'app-job-offers-list',
  standalone: true,
  imports: [CommonModule, OfferCardComponent],
  template: `
    <div class="flex flex-col gap-4">

      <!-- Lista Ofert -->
      <div class="flex flex-col gap-4">
        @for (offer of offers(); track offer.id) {
          <app-offer-card [offer]="offer"></app-offer-card>
        } @empty {
          @if (!loading()) {
            <div class="bg-white p-10 rounded-lg shadow-sm border border-gray-200 text-center">
              <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <h3 class="text-lg font-medium text-gray-900">Brak wyników</h3>
              <p class="mt-1 text-gray-500">Nie znaleźliśmy ofert spełniających Twoje kryteria. Spróbuj zmienić filtry.</p>
            </div>
          }
        }
      </div>

      <!-- Spinner ładowania -->
      @if (loading()) {
        <div class="flex justify-center p-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }

      <!-- Pusty element dla Intersection Observer (Trigger nieskończonego scrollowania) -->
      <div #scrollTrigger class="h-4 w-full"></div>
      
      @if (!hasMore() && offers().length > 0) {
        <div class="text-center p-4 text-gray-500 text-sm">
          To już wszystkie oferty spełniające Twoje kryteria.
        </div>
      }
    </div>
  `
})
export class JobOffersListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollTrigger') scrollTrigger!: ElementRef;
  
  jobBoardService = inject(JobBoardService);
  offers = this.jobBoardService.offers;
  loading = this.jobBoardService.loading;
  hasMore = this.jobBoardService.hasMore;

  private observer: IntersectionObserver | null = null;

  ngOnInit() {
    // Inicjalne załadowanie danych - JobBoardComponent może też to robić, ale zrobimy to tu
    this.jobBoardService.loadOffers(true); 
  }

  ngAfterViewInit() {
    this.setupIntersectionObserver();
  }

  private setupIntersectionObserver() {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    this.observer = new IntersectionObserver((entries) => {
      const isIntersecting = entries[0].isIntersecting;
      if (isIntersecting && !this.loading() && this.hasMore()) {
        this.jobBoardService.loadNextPage();
      }
    }, options);

    if (this.scrollTrigger) {
      this.observer.observe(this.scrollTrigger.nativeElement);
    }
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
