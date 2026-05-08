import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LookupDto } from '../models/offers.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CvApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/cv`;

  uploadCv(file: File): Observable<LookupDto[]> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<LookupDto[]>(`${this.base}/upload`, formData);
  }
}
