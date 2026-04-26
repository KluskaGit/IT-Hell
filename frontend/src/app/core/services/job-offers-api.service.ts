import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JobOfferApiResponse, LookupDto } from '../models/offers.models';
import { environment } from '../../../environments/environment';

type WorkMode = 'remote' | 'hybrid' | 'onsite';
type Seniority = 'Stażysta / Trainee' | 'Junior' | 'Mid / Regular' | 'Senior';

const WORK_TYPE_TO_MODE: Record<string, WorkMode> = {
  'Praca zdalna': 'remote',
  'Praca hybrydowa': 'hybrid',
  'Praca stacjonarna': 'onsite',
  'Zdalnie': 'remote',
  'Hybrydowo': 'hybrid',
  'Stacjonarnie': 'onsite',
};

const EXP_LEVEL_TO_SENIORITY: Record<string, Seniority> = {
  'Praktykant / Praktykantka - stażysta / Stażystka': 'Stażysta / Trainee',
  'Młodszy specjalista / Młodsza specjalistka (junior)': 'Junior',
  'Junior': 'Junior',
  'Specjalista / Specjalistka (mid / Regular)': 'Mid / Regular',
  'Mid': 'Mid / Regular',
  'Starszy specjalista / Starsza specjalistka (senior)': 'Senior',
  'Senior': 'Senior',
  'Ekspert / Ekspertka': 'Senior',
  'Kierownik / Kierowniczka - koordynator / Koordynatorka': 'Senior',
  'Menedżer / Menedżerka': 'Senior',
};

export function techNameToKey(name: string): string {
  const OVERRIDES: Record<string, string> = {
    'JavaScript': 'javascript', 'TypeScript': 'typescript', 'HTML': 'html', 'CSS': 'css',
    'SQL': 'sql', 'Python': 'python', 'Java': 'java', 'C#': 'csharp', 'PHP': 'php',
    'C++': 'cpp', 'C': 'c', '.NET': 'dotnet', 'React.js': 'react', 'React': 'react',
    'Angular': 'angular', 'Android': 'android', 'AWS': 'aws', 'iOS': 'ios',
    'Rust': 'rust', 'R': 'r', 'Node.js': 'nodejs', 'Ruby on Rails': 'ruby',
    'Hibernate': 'hibernate', 'Go': 'go',
  };
  return OVERRIDES[name] ?? name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function specNameToKey(name: string): string {
  const OVERRIDES: Record<string, string> = {
    'Backend': 'backend', 'Frontend': 'frontend', 'Fullstack': 'fullstack',
    'Full-stack': 'fullstack', 'Mobile': 'mobile', 'Architecture': 'architecture',
    'DevOps': 'devops', 'Game dev': 'gamedev', 'Data analytics & BI': 'data',
    'Big Data / Data Science': 'bigdata', 'Embedded': 'embedded', 'QA/Testing': 'qa',
    'Security': 'security', 'Helpdesk': 'helpdesk', 'Product Management': 'product',
    'Project Management': 'project', 'Agile': 'agile', 'UX/UI': 'ux',
    'Business analytics': 'business', 'System analytics': 'system',
    'SAP&ERP': 'sap', 'IT admin': 'admin', 'AI/ML': 'ai',
  };
  return OVERRIDES[name] ?? name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export interface MappedOffer {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: WorkMode;
  contractType: 'uop';
  salaryMin: number;
  salaryMax: number;
  technologies: string[];
  technologyNames: string[];
  roles: string[];
  seniority: Seniority;
  source: string;
  postedLabel: string;
  description: string;
  url?: string;
}

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
  }): Observable<JobOfferApiResponse[]> {
    let httpParams = new HttpParams();
    if (params?.salary_from_min != null) httpParams = httpParams.set('salary_from_min', params.salary_from_min);
    if (params?.salary_to_max != null) httpParams = httpParams.set('salary_to_max', params.salary_to_max);
    if (params?.skip != null) httpParams = httpParams.set('skip', params.skip);
    if (params?.limit != null) httpParams = httpParams.set('limit', params.limit);
    for (const id of params?.technology_ids ?? []) httpParams = httpParams.append('technology_ids', id);
    for (const id of params?.specialization_ids ?? []) httpParams = httpParams.append('specialization_ids', id);
    for (const id of params?.work_type_ids ?? []) httpParams = httpParams.append('work_type_ids', id);
    for (const id of params?.exp_level_ids ?? []) httpParams = httpParams.append('exp_level_ids', id);

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
      company: api.company?.name ?? 'Nieznana firma',
      location: locations.map(l => l.name).join(', ') || 'Zdalnie',
      workMode: WORK_TYPE_TO_MODE[api.work_type?.name ?? ''] ?? 'remote',
      contractType: 'uop',
      salaryMin: api.salary_from ?? 0,
      salaryMax: api.salary_to ?? 0,
      technologies: technologies.map(t => techNameToKey(t.name)),
      technologyNames: technologies.map(t => t.name),
      roles: api.specialization ? [specNameToKey(api.specialization.name)] : [],
      seniority: EXP_LEVEL_TO_SENIORITY[api.exp_level?.name ?? ''] ?? 'Mid / Regular',
      source: siteNameToKey(api.site?.name ?? ''),
      postedLabel: '',
      description,
      url: api.url,
    };
  }

  buildLookupItems(lookups: LookupDto[], nameFn: (name: string) => string): { key: string; label: string }[] {
    return lookups.map(l => ({ key: nameFn(l.name), label: l.name }));
  }
}

function siteNameToKey(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('pracuj')) return 'pracuj';
  if (lower.includes('nofluff')) return 'nofluff';
  if (lower.includes('justjoin')) return 'justjoin';
  if (lower.includes('linkedin')) return 'linkedin';
  if (lower.includes('olx')) return 'olx';
  return lower.replace(/[^a-z0-9]/g, '');
}
