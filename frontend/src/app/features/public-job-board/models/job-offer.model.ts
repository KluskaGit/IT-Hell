import { LookupRead } from './lookup.model';

export interface JobOfferResponse {
  id: string;
  url: string;
  title: string;
  description: string;
  salary_from: number | null;
  salary_to: number | null;
  
  site: LookupRead | null;
  company: LookupRead | null;
  work_type: LookupRead | null;
  exp_level: LookupRead | null;
  specialization: LookupRead | null;
  
  technologies: LookupRead[];
  locations: LookupRead[];
}
