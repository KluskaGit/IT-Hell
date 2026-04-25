export interface LookupDto {
  id: string;
  name: string;
}

export interface JobOfferApiResponse {
  id: string;
  url: string;
  title: string;
  description: string;
  salary_from: number | null;
  salary_to: number | null;
  site: LookupDto | null;
  company: LookupDto | null;
  work_type: LookupDto | null;
  exp_level: LookupDto | null;
  specialization: LookupDto | null;
  technologies: LookupDto[];
  locations: LookupDto[];
}
