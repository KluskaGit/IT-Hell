import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { JobOffersApiService, MappedOffer } from '../../app/core/services/job-offers-api.service';

type WorkMode = 'remote' | 'hybrid' | 'onsite';
type ContractType = 'uop' | 'b2b' | 'uz';
type Seniority = 'Stażysta / Trainee' | 'Junior' | 'Mid / Regular' | 'Senior';

type JobOffer = MappedOffer & { contractType: ContractType };

interface CandidateFilters {
  itArea: Record<string, boolean>;
  seniority: Seniority;
  technologies: Record<string, boolean>;
  englishLevel: string;
  isStudent: boolean;
  studyYear: number | null;
  salaryFromIndex: number;
  salaryToIndex: number;
  contractType: ContractType;
  noticePeriod: string;
  jobSites: Record<string, boolean>;
  matchPrecision: number;
}

interface OfferViewModel extends JobOffer {
  matchScore: number;
  matchedTech: string[];
  matchedRoles: string[];
}

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './offers.component.html',
  styleUrls: ['./offers.component.css']
})
export class OffersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly jobOffersApi = inject(JobOffersApiService);

  readonly salaryOptions = [
    0, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
    13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 22000,
    25000, 30000, 35000, 40000, 45000, 50000
  ];

  readonly roleLabels: Record<string, string> = {
    backend: 'Backend', frontend: 'Frontend', fullstack: 'Full-stack', mobile: 'Mobile',
    architecture: 'Architecture', devops: 'DevOps', gamedev: 'Game dev',
    data: 'Data analytics & BI', bigdata: 'Big Data / Data Science', embedded: 'Embedded',
    qa: 'QA/Testing', security: 'Security', helpdesk: 'Helpdesk', product: 'Product Management',
    project: 'Project Management', agile: 'Agile', ux: 'UX/UI', business: 'Business analytics',
    system: 'System analytics', sap: 'SAP&ERP', admin: 'IT admin', ai: 'AI/ML',
  };

  readonly techLabels: Record<string, string> = {
    javascript: 'JavaScript', html: 'HTML', sql: 'SQL', python: 'Python', java: 'Java',
    csharp: 'C#', php: 'PHP', cpp: 'C++', typescript: 'TypeScript', go: 'Go', c: 'C',
    dotnet: '.NET', react: 'React.js', angular: 'Angular', android: 'Android', aws: 'AWS',
    ios: 'iOS', rust: 'Rust', r: 'R', nodejs: 'Node.js', ruby: 'Ruby on Rails', hibernate: 'Hibernate',
  };

  cvFileName: string | null = null;
  filtersForm!: FormGroup;
  filtersCollapsed = true;

  allOffers: JobOffer[] = [];
  matchedOffers: OfferViewModel[] = [];
  previewOffersCount = 0;

  showAllRoles = false;
  showAllTech = false;

  isLoading = false;
  loadError: string | null = null;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const navState = history.state as { filters?: CandidateFilters; cvFileName?: string | null };

    if (!navState?.filters) {
      this.router.navigate(['/']);
      return;
    }

    this.cvFileName = navState.cvFileName ?? null;
    this.filtersForm = this.buildFiltersForm(navState.filters);
    this.isLoading = true;
    this.loadOffersFromApi();
  }

  private loadOffersFromApi(): void {
    this.jobOffersApi.getOffers({ limit: 100 }).subscribe({
      next: (apiOffers) => {
        this.allOffers = apiOffers.map(o => this.jobOffersApi.mapToOffer(o) as JobOffer);
        this.isLoading = false;
        this.applyFilters();
        this.setupPreviewListener();
      },
      error: () => {
        this.loadError = 'Nie udało się załadować ofert. Sprawdź czy backend jest uruchomiony.';
        this.isLoading = false;
        this.setupPreviewListener();
      },
    });
  }

  private isSalaryInRange(offer: JobOffer): boolean {
    const min = this.salaryFromValue;
    const max = this.salaryToValue;
    if (offer.salaryMin === 0 && offer.salaryMax === 0) return true;
    return offer.salaryMax >= min && offer.salaryMin <= max;
  }

  private buildFiltersForm(filters: CandidateFilters): FormGroup {
    return this.fb.group({
      itArea: this.fb.group({ ...filters.itArea }),
      seniority: [filters.seniority],
      technologies: this.fb.group({ ...filters.technologies }),
      salaryFromIndex: [filters.salaryFromIndex],
      salaryToIndex: [filters.salaryToIndex],
      contractType: [filters.contractType],
      noticePeriod: [filters.noticePeriod],
      jobSites: this.fb.group({ ...filters.jobSites }),
      matchPrecision: [filters.matchPrecision]
    });
  }

  private setupPreviewListener(): void {
    this.filtersForm.valueChanges.subscribe(() => {
      this.previewOffersCount = this.getFilteredOffers().length;
    });
  }

  applyFilters(): void {
    this.checkSalaryRange('from');
    this.matchedOffers = this.getFilteredOffers();
    this.previewOffersCount = this.matchedOffers.length;
  }

  private getFilteredOffers(): OfferViewModel[] {
    return this.allOffers
      .filter((offer) => this.isSalaryInRange(offer) && this.isSourceAllowed(offer.source))
      .map((offer) => this.toOfferViewModel(offer))
      .filter((offer) => {
        const minScore = Number(this.filtersForm.get('matchPrecision')?.value ?? 75);
        return offer.matchScore >= minScore;
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  openOffer(offer: OfferViewModel): void {
    if (offer.url && isPlatformBrowser(this.platformId)) {
      window.open(offer.url, '_blank', 'noopener,noreferrer');
    }
  }

  hasSalary(offer: OfferViewModel): boolean {
    return offer.salaryMin > 0 || offer.salaryMax > 0;
  }

  private toOfferViewModel(offer: JobOffer): OfferViewModel {
    const selectedRoles = this.getSelectedRoles();
    const selectedTech = this.getSelectedTechnologies();
    const matchedRoles = offer.roles.filter((role) => selectedRoles.includes(role));
    const matchedTech = offer.technologies.filter((tech) => selectedTech.includes(tech));
    return { ...offer, matchedRoles, matchedTech, matchScore: this.calculateMatchScore(offer, matchedRoles, matchedTech) };
  }

  private calculateMatchScore(offer: JobOffer, matchedRoles: string[], matchedTech: string[]): number {
    let score = 0;
    const selectedTech = this.getSelectedTechnologies();
    const selectedSeniority = this.filtersForm.get('seniority')?.value as Seniority;
    const selectedContract = this.filtersForm.get('contractType')?.value as ContractType;
    const salaryFrom = this.salaryFromValue;
    const salaryTo = this.salaryToValue;

    if (matchedRoles.length > 0) score += 30;
    if (offer.seniority === selectedSeniority) {
      score += 25;
    } else if (selectedSeniority === 'Mid / Regular' && (offer.seniority === 'Junior' || offer.seniority === 'Senior')) {
      score += 10;
    }
    if (selectedTech.length > 0) score += Math.min((matchedTech.length / Math.max(offer.technologies.length, 1)) * 30, 30);
    if (offer.contractType === selectedContract) score += 5;
    if (offer.salaryMax >= salaryFrom && offer.salaryMin <= salaryTo) score += 10;
    return Math.round(Math.min(score, 100));
  }

  checkSalaryRange(type: 'from' | 'to'): void {
    const fromCtrl = this.filtersForm.get('salaryFromIndex');
    const toCtrl = this.filtersForm.get('salaryToIndex');
    if (!fromCtrl || !toCtrl) return;
    const from = Number(fromCtrl.value);
    const to = Number(toCtrl.value);
    if (from >= to) {
      if (type === 'from') toCtrl.setValue(from + 1, { emitEvent: false });
      else fromCtrl.setValue(to - 1, { emitEvent: false });
    }
  }

  get salaryFromValue(): number {
    return this.salaryOptions[Number(this.filtersForm?.get('salaryFromIndex')?.value ?? 0)] ?? 0;
  }

  get salaryToValue(): number {
    return this.salaryOptions[Number(this.filtersForm?.get('salaryToIndex')?.value ?? this.salaryOptions.length - 1)] ?? 0;
  }

  getSalaryProgressPercent(): number {
    const from = Number(this.filtersForm.get('salaryFromIndex')?.value ?? 0);
    const to = Number(this.filtersForm.get('salaryToIndex')?.value ?? this.salaryOptions.length - 1);
    return ((to - from) / (this.salaryOptions.length - 1)) * 100;
  }

  getSalaryProgressLeft(): number {
    const from = Number(this.filtersForm.get('salaryFromIndex')?.value ?? 0);
    return (from / (this.salaryOptions.length - 1)) * 100;
  }

  getSelectedRoles(): string[] {
    const group = this.filtersForm.get('itArea')?.value as Record<string, boolean>;
    return Object.entries(group).filter(([, v]) => v).map(([k]) => k);
  }

  getSelectedTechnologies(): string[] {
    const group = this.filtersForm.get('technologies')?.value as Record<string, boolean>;
    return Object.entries(group).filter(([, v]) => v).map(([k]) => k);
  }

  getSelectedSources(): string[] {
    const group = this.filtersForm.get('jobSites')?.value as Record<string, boolean>;
    return Object.entries(group).filter(([, v]) => v).map(([k]) => k);
  }

  formatRole(role: string): string { return this.roleLabels[role] ?? role; }
  formatTech(tech: string): string { return this.techLabels[tech] ?? tech; }

  getVisibleRoles(): string[] {
    const roles = Object.keys(this.roleLabels);
    return this.showAllRoles ? roles : roles.slice(0, 8);
  }

  getVisibleTechnologies(): string[] {
    const tech = Object.keys(this.techLabels);
    return this.showAllTech ? tech : tech.slice(0, 10);
  }

  isSourceAllowed(source: string): boolean {
    const selected = this.getSelectedSources();
    return selected.length === 0 || selected.includes(source);
  }

  getWorkModeLabel(mode: WorkMode): string {
    const labels: Record<WorkMode, string> = { remote: 'Zdalnie', hybrid: 'Hybrydowo', onsite: 'Stacjonarnie' };
    return labels[mode];
  }

  getContractLabel(contract: ContractType): string {
    const labels: Record<ContractType, string> = { uop: 'UoP', b2b: 'B2B', uz: 'UZ / UoD' };
    return labels[contract];
  }

  formatSource(source: string): string {
    const labels: Record<string, string> = { pracuj: 'Pracuj.pl', olx: 'OLX Praca', linkedin: 'LinkedIn', nofluff: 'NoFluffJobs' };
    return labels[source] ?? source;
  }

  getMatchClass(score: number): string {
    if (score >= 90) return 'match-excellent';
    if (score >= 75) return 'match-good';
    return 'match-fair';
  }
}
