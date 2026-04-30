import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobOfferResponse } from '../../../features/public-job-board/models/job-offer.model';

@Component({
  selector: 'app-offer-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <a [href]="offer.url" target="_blank" 
       class="block bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer">
      
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        
        <!-- Left Side: Title & Company -->
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            @if (offer.company) {
              <span class="text-sm font-medium text-gray-500 uppercase tracking-wider">{{ offer.company.name }}</span>
            } @else {
              <span class="text-sm font-medium text-gray-400 uppercase tracking-wider">Nieznana firma</span>
            }
          </div>
          
          <h2 class="text-xl font-bold text-gray-900 mb-2">{{ offer.title }}</h2>
          
          <!-- Locations -->
          @if (offer.locations && offer.locations.length > 0) {
            <div class="flex flex-wrap gap-1 mb-4">
              <svg class="w-4 h-4 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              @for (loc of offer.locations; track loc.id) {
                <span class="text-sm text-gray-600">{{ loc.name }}@if (!$last) {<span>, </span>}</span>
              }
            </div>
          }
        </div>

        <!-- Right Side: Salary -->
        <div class="sm:text-right shrink-0">
          @if (offer.salary_from || offer.salary_to) {
            <div class="text-lg font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-md inline-block">
              @if (offer.salary_from) { <span>{{ offer.salary_from }}</span> }
              @if (offer.salary_from && offer.salary_to) { <span> - </span> }
              @if (offer.salary_to) { <span>{{ offer.salary_to }}</span> }
              <span class="text-sm ml-1">PLN</span>
            </div>
          } @else {
            <span class="text-sm text-gray-400">Wynagrodzenie nieznane</span>
          }
        </div>
      </div>

      <!-- Bottom: Technologies & Attributes -->
      <div class="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-2">
        <!-- Main categories as prominent badges -->
        @if (offer.exp_level) {
          <span class="px-2.5 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
            {{ offer.exp_level.name }}
          </span>
        }
        @if (offer.work_type) {
          <span class="px-2.5 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
            {{ offer.work_type.name }}
          </span>
        }

        <!-- Generic separator if we have tech -->
        @if ((offer.exp_level || offer.work_type) && offer.technologies && offer.technologies.length > 0) {
          <span class="text-gray-300 ml-1 mr-1">|</span>
        }

        <!-- Technology Chips -->
        @for (tech of offer.technologies; track tech.id) {
          <span class="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
            {{ tech.name }}
          </span>
        }
      </div>
    </a>
  `
})
export class OfferCardComponent {
  @Input({ required: true }) offer!: JobOfferResponse;
}
