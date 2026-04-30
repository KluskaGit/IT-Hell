import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { JobOfferResponse } from '../../features/public-job-board/models/job-offer.model';
import { LookupRead } from '../../features/public-job-board/models/lookup.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  // Pobieranie list słownikowych
  getLookups(type: string): Observable<LookupRead[]> {
    return this.http.get<LookupRead[]>(`${this.baseUrl}/lookups/${type}`);
  }

  // Pobieranie ofert pracy na podstawie filtrów
  getOffers(skip: number = 0, limit: number = 20, filters: any = {}): Observable<JobOfferResponse[]> {
    let params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    // Filtry tekstowe/liczbowe
    if (filters.title) {
      params = params.set('title', filters.title);
    }
    if (filters.salary_from_min) {
      params = params.set('salary_from_min', filters.salary_from_min.toString());
    }
    if (filters.salary_to_max) {
      params = params.set('salary_to_max', filters.salary_to_max.toString());
    }
    
    // Tablice UUID - FastAPI przez Pydantic parsuje je poprawnie jeśli dodajemy klucze wielokrotnie
    // np. ?technology_ids=uuid1&technology_ids=uuid2
    const arrayFilters = ['work_type_ids', 'specialization_ids', 'exp_level_ids', 'technology_ids', 'location_ids', 'site_ids'];
    
    arrayFilters.forEach(key => {
      if (filters[key] && Array.isArray(filters[key]) && filters[key].length > 0) {
        filters[key].forEach((id: string) => {
          params = params.append(key, id);
        });
      }
    });

    return this.http.get<JobOfferResponse[]>(`${this.baseUrl}/job-offers/get_offer_filter`, { params });
  }
}
