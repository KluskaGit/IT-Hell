import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FiltersComponent } from './components/filters/filters.component';
import { JobOffersListComponent } from './components/job-offers-list/job-offers-list.component';

@Component({
  selector: 'app-public-job-board',
  standalone: true,
  imports: [CommonModule, FiltersComponent, JobOffersListComponent],
  template: `
    <div class="flex flex-col lg:flex-row gap-6">
      
      <!-- Lewa kolumna: Formularz Filtrów -->
      <div class="w-full lg:w-1/3 xl:w-1/4">
        <app-filters></app-filters>
      </div>
      
      <!-- Prawa kolumna: Lista Ofert z nieskończonym scrollowaniem -->
      <div class="w-full lg:w-2/3 xl:w-3/4">
        <app-job-offers-list></app-job-offers-list>
      </div>
      
    </div>
  `
})
export class PublicJobBoardComponent {}
