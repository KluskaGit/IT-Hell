import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JobOfferApiResponse, LookupDto } from '../models/offers.models';
import { environment } from '../../../environments/environment';


export interface MappedOffer {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: string;
  workTypeId: string;
  salaryMin: number;
  salaryMax: number;
  technologies: string[];
  technologyNames: string[];
  roles: string[];
  seniority: string;
  source: string;
  postedLabel: string;
  description: string;
  url?: string;
}

const FALLBACK_COMPANY  = 'Nieznana firma';
const FALLBACK_LOCATION = 'Zdalnie';
const FALLBACK_UNKNOWN  = 'Nie podano';

@Injectable({ providedIn: 'root' })
export class JobOffersApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/job-offers`;

  getOffers(params?: {
    salary_from_min?: number;
    salary_to_max?: number;
    skip?: number;
    limit?: number;
    technology_ids?: string[];
    specialization_ids?: string[];
    work_type_ids?: string[];
    exp_level_ids?: string[];
    site_ids?: string[];
    location_ids?: string[];
    title?: string;
  }): Observable<JobOfferApiResponse[]> {
    let httpParams = new HttpParams();
    if (params?.salary_from_min != null) httpParams = httpParams.set('salary_from_min', params.salary_from_min);
    if (params?.salary_to_max != null) httpParams = httpParams.set('salary_to_max', params.salary_to_max);
    if (params?.skip != null) httpParams = httpParams.set('skip', params.skip);
    if (params?.limit != null) httpParams = httpParams.set('limit', params.limit);
    if (params?.title) httpParams = httpParams.set('title', params.title);
    for (const id of params?.technology_ids ?? []) httpParams = httpParams.append('technology_ids', id);
    for (const id of params?.specialization_ids ?? []) httpParams = httpParams.append('specialization_ids', id);
    for (const id of params?.work_type_ids ?? []) httpParams = httpParams.append('work_type_ids', id);
    for (const id of params?.exp_level_ids ?? []) httpParams = httpParams.append('exp_level_ids', id);
    for (const id of params?.site_ids ?? []) httpParams = httpParams.append('site_ids', id);
    for (const id of params?.location_ids ?? []) httpParams = httpParams.append('location_ids', id);
    return this.http.get<JobOfferApiResponse[]>(`${this.base}/get_offer_filter`, { params: httpParams });
  }

  mapToOffer(api: JobOfferApiResponse): MappedOffer {
    const locations = api.locations ?? [];
    const technologies = api.technologies ?? [];
    const rawDesc = api.description;
    const description = (rawDesc && rawDesc !== 'None') ? rawDesc : '';
    return {
      id: api.id,
      title: api.title ?? '',
      company: api.company?.name ?? FALLBACK_COMPANY,
      location: locations.map(l => l.name).join(', ') || FALLBACK_LOCATION,
      workMode: api.work_type?.name ?? FALLBACK_UNKNOWN,
      workTypeId: api.work_type?.id ?? '',
      salaryMin: api.salary_from ?? 0,
      salaryMax: api.salary_to ?? 0,
      technologies: technologies.map(t => t.id),
      technologyNames: technologies.map(t => t.name),
      roles: api.specialization ? [api.specialization.id] : [],
      seniority: api.exp_level?.name ?? FALLBACK_UNKNOWN,
      source: api.site?.id ?? '',
      postedLabel: '',
      description,
      url: api.url,
    };
  }

}
