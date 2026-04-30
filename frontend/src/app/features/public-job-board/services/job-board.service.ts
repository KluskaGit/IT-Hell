import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { JobOfferResponse } from '../models/job-offer.model';
import { finalize } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class JobBoardService {
  private apiService = inject(ApiService);

  // State Signals
  readonly offers = signal<JobOfferResponse[]>([]);
  readonly loading = signal<boolean>(false);
  readonly hasMore = signal<boolean>(true); // To stop infinite scroll when backend returns less than limit
  
  // Pagination State
  private skip = 0;
  private readonly limit = 20;

  // Current Filters State
  private currentFilters: any = {};

  loadOffers(reset: boolean = false) {
    if (this.loading()) return;
    
    if (reset) {
      this.skip = 0;
      this.hasMore.set(true);
      // We purposefully don't clear offers immediately to prevent UI flashing, 
      // or we can clear it if we want to show a strict loading skeleton.
      // this.offers.set([]); 
    }

    if (!this.hasMore() && !reset) return;

    this.loading.set(true);

    this.apiService.getOffers(this.skip, this.limit, this.currentFilters)
      .pipe(
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (newOffers) => {
          if (newOffers.length < this.limit) {
            this.hasMore.set(false); // Reached the end
          }
          
          if (reset) {
            this.offers.set(newOffers);
          } else {
            this.offers.update(prev => [...prev, ...newOffers]);
          }
          
          this.skip += this.limit;
        },
        error: (err) => {
          console.error('Failed to load offers', err);
          // Handle error state if needed
        }
      });
  }

  updateFilters(filters: any) {
    this.currentFilters = { ...filters };
    this.loadOffers(true); // Reset list on filter change
  }

  loadNextPage() {
    this.loadOffers(false);
  }
}
