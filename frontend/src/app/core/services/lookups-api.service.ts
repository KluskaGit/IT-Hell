// Dane słownikowe pobierane w forkJoin przez FiltersFormComponent przy inicjalizacji
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LookupDto } from '../models/offers.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LookupsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/lookups`;

  getTechnologies(): Observable<LookupDto[]> {
    return this.http.get<LookupDto[]>(`${this.base}/technologies`);
  }

  getSpecializations(): Observable<LookupDto[]> {
    return this.http.get<LookupDto[]>(`${this.base}/specializations`);
  }

  getWorkTypes(): Observable<LookupDto[]> {
    return this.http.get<LookupDto[]>(`${this.base}/work-types`);
  }

  getExperienceLevels(): Observable<LookupDto[]> {
    return this.http.get<LookupDto[]>(`${this.base}/experience-levels`);
  }

  getSites(): Observable<LookupDto[]> {
    return this.http.get<LookupDto[]>(`${this.base}/sites`);
  }

  getLocations(): Observable<LookupDto[]> {
    return this.http.get<LookupDto[]>(`${this.base}/locations`);
  }
}
