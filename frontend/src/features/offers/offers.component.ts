import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

type WorkMode = 'remote' | 'hybrid' | 'onsite';
type ContractType = 'uop' | 'b2b' | 'uz';
type Seniority = 'Stażysta / Trainee' | 'Junior' | 'Mid / Regular' | 'Senior';

interface JobOffer {
  id: number;
  title: string;
  company: string;
  location: string;
  workMode: WorkMode;
  contractType: ContractType;
  salaryMin: number;
  salaryMax: number;
  technologies: string[];
  roles: string[];
  seniority: Seniority;
  source: string;
  postedLabel: string;
  description: string;
}

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
  readonly salaryOptions = [
    0, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
    13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 22000,
    25000, 30000, 35000, 40000, 45000, 50000
  ];

  readonly roleLabels: Record<string, string> = {
    backend: 'Backend',
    frontend: 'Frontend',
    fullstack: 'Full-stack',
    mobile: 'Mobile',
    architecture: 'Architecture',
    devops: 'DevOps',
    gamedev: 'Game dev',
    data: 'Data analytics & BI',
    bigdata: 'Big Data / Data Science',
    embedded: 'Embedded',
    qa: 'QA/Testing',
    security: 'Security',
    helpdesk: 'Helpdesk',
    product: 'Product Management',
    project: 'Project Management',
    agile: 'Agile',
    ux: 'UX/UI',
    business: 'Business analytics',
    system: 'System analytics',
    sap: 'SAP&ERP',
    admin: 'IT admin',
    ai: 'AI/ML'
  };

  readonly techLabels: Record<string, string> = {
    javascript: 'JavaScript',
    html: 'HTML',
    sql: 'SQL',
    python: 'Python',
    java: 'Java',
    csharp: 'C#',
    php: 'PHP',
    cpp: 'C++',
    typescript: 'TypeScript',
    go: 'Go',
    c: 'C',
    dotnet: '.NET',
    react: 'React.js',
    angular: 'Angular',
    android: 'Android',
    aws: 'AWS',
    ios: 'iOS',
    rust: 'Rust',
    r: 'R',
    nodejs: 'Node.js',
    ruby: 'Ruby on Rails',
    hibernate: 'Hibernate'
  };

  cvFileName: string | null = null;

  filtersForm!: FormGroup;
  filtersCollapsed = true;

  allOffers: JobOffer[] = [];
  matchedOffers: OfferViewModel[] = [];
  previewOffersCount = 0;

  showAllRoles = false;
  showAllTech = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const navState = history.state as {
      filters?: CandidateFilters;
      cvFileName?: string | null;
    };

    if (!navState?.filters) {
      this.router.navigate(['/']);
      return;
    }

    this.cvFileName = navState.cvFileName ?? null;

    this.filtersForm = this.buildFiltersForm(navState.filters);
    this.allOffers = this.getMockOffers();

    this.applyFilters();
    this.setupPreviewListener();
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
      .map((offer) => this.toOfferViewModel(offer))
      .filter((offer) => {
        const minScore = Number(this.filtersForm.get('matchPrecision')?.value ?? 75);
        return offer.matchScore >= minScore;
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  private toOfferViewModel(offer: JobOffer): OfferViewModel {
    const selectedRoles = this.getSelectedRoles();
    const selectedTech = this.getSelectedTechnologies();

    const matchedRoles = offer.roles.filter((role) => selectedRoles.includes(role));
    const matchedTech = offer.technologies.filter((tech) => selectedTech.includes(tech));

    return {
      ...offer,
      matchedRoles,
      matchedTech,
      matchScore: this.calculateMatchScore(offer, matchedRoles, matchedTech)
    };
  }

  private calculateMatchScore(
    offer: JobOffer,
    matchedRoles: string[],
    matchedTech: string[]
  ): number {
    let score = 0;

    const selectedRoles = this.getSelectedRoles();
    const selectedTech = this.getSelectedTechnologies();

    const selectedSeniority = this.filtersForm.get('seniority')?.value as Seniority;
    const selectedContract = this.filtersForm.get('contractType')?.value as ContractType;

    const salaryFrom = this.salaryFromValue;
    const salaryTo = this.salaryToValue;

    if (matchedRoles.length > 0) {
      score += 30;
    }

    if (offer.seniority === selectedSeniority) {
      score += 25;
    } else if (
      selectedSeniority === 'Mid / Regular' &&
      (offer.seniority === 'Junior' || offer.seniority === 'Senior')
    ) {
      score += 10;
    }

    if (selectedTech.length > 0) {
      score += Math.min((matchedTech.length / offer.technologies.length) * 30, 30);
    }

    if (offer.contractType === selectedContract) {
      score += 5;
    }

    const salaryMatches =
      offer.salaryMax >= salaryFrom && offer.salaryMin <= salaryTo;

    if (salaryMatches) {
      score += 10;
    }

    return Math.round(Math.min(score, 100));
  }

  checkSalaryRange(type: 'from' | 'to'): void {
    const fromCtrl = this.filtersForm.get('salaryFromIndex');
    const toCtrl = this.filtersForm.get('salaryToIndex');

    if (!fromCtrl || !toCtrl) return;

    let from = Number(fromCtrl.value);
    let to = Number(toCtrl.value);

    if (from >= to) {
      if (type === 'from') {
        toCtrl.setValue(from + 1, { emitEvent: false });
      } else {
        fromCtrl.setValue(to - 1, { emitEvent: false });
      }
    }
  }

  get salaryFromValue(): number {
    return this.salaryOptions[
      Number(this.filtersForm.get('salaryFromIndex')?.value ?? 0)
    ] ?? 0;
  }

  get salaryToValue(): number {
    return this.salaryOptions[
      Number(this.filtersForm.get('salaryToIndex')?.value ?? this.salaryOptions.length - 1)
    ] ?? 0;
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
    const rolesGroup = this.filtersForm.get('itArea')?.value as Record<string, boolean>;
    return Object.entries(rolesGroup)
      .filter(([, value]) => value)
      .map(([key]) => key);
  }

  getSelectedTechnologies(): string[] {
    const techGroup = this.filtersForm.get('technologies')?.value as Record<string, boolean>;
    return Object.entries(techGroup)
      .filter(([, value]) => value)
      .map(([key]) => key);
  }

  getSelectedSources(): string[] {
    const sourcesGroup = this.filtersForm.get('jobSites')?.value as Record<string, boolean>;
    return Object.entries(sourcesGroup)
      .filter(([, value]) => value)
      .map(([key]) => key);
  }

  formatRole(role: string): string {
    return this.roleLabels[role] ?? role;
  }

  formatTech(tech: string): string {
    return this.techLabels[tech] ?? tech;
  }

  getVisibleRoles(): string[] {
    const roles = Object.keys(this.roleLabels);
    return this.showAllRoles ? roles : roles.slice(0, 8);
  }

  getVisibleTechnologies(): string[] {
    const tech = Object.keys(this.techLabels);
    return this.showAllTech ? tech : tech.slice(0, 10);
  }

  isSourceAllowed(source: string): boolean {
    const selectedSources = this.getSelectedSources();
    if (selectedSources.length === 0) return true;
    return selectedSources.includes(source);
  }

  getWorkModeLabel(mode: WorkMode): string {
    switch (mode) {
      case 'remote':
        return 'Zdalnie';
      case 'hybrid':
        return 'Hybrydowo';
      case 'onsite':
        return 'Stacjonarnie';
    }
  }

  getContractLabel(contract: ContractType): string {
    switch (contract) {
      case 'uop':
        return 'UoP';
      case 'b2b':
        return 'B2B';
      case 'uz':
        return 'UZ / UoD';
    }
  }

  formatSource(source: string): string {
    switch (source) {
      case 'pracuj':
        return 'Pracuj.pl';
      case 'olx':
        return 'OLX Praca';
      case 'linkedin':
        return 'LinkedIn';
      case 'nofluff':
        return 'NoFluffJobs';
      default:
        return source;
    }
  }

  getMatchClass(score: number): string {
    if (score >= 90) return 'match-excellent';
    if (score >= 75) return 'match-good';
    return 'match-fair';
  }

  private getMockOffers(): JobOffer[] {
    const offers: JobOffer[] = [
      {
        id: 1,
        title: 'Junior Backend Developer',
        company: 'CodeForge',
        location: 'Kraków',
        workMode: 'hybrid',
        contractType: 'uop',
        salaryMin: 8000,
        salaryMax: 12000,
        technologies: ['java', 'sql', 'hibernate'],
        roles: ['backend'],
        seniority: 'Junior',
        source: 'pracuj',
        postedLabel: 'Dzisiaj',
        description: 'Rozwój aplikacji backendowych w Javie oraz praca z bazami danych.'
      },
      {
        id: 2,
        title: 'Frontend Angular Developer',
        company: 'SoftWave',
        location: 'Warszawa',
        workMode: 'hybrid',
        contractType: 'uop',
        salaryMin: 10000,
        salaryMax: 15000,
        technologies: ['angular', 'typescript', 'html', 'javascript'],
        roles: ['frontend'],
        seniority: 'Mid / Regular',
        source: 'linkedin',
        postedLabel: '1 dzień temu',
        description: 'Budowa nowoczesnych interfejsów w Angularze i TypeScripcie.'
      },
      {
        id: 3,
        title: 'Full-stack Developer',
        company: 'BlueBit',
        location: 'Wrocław',
        workMode: 'remote',
        contractType: 'b2b',
        salaryMin: 14000,
        salaryMax: 20000,
        technologies: ['typescript', 'nodejs', 'angular', 'sql'],
        roles: ['fullstack', 'backend', 'frontend'],
        seniority: 'Mid / Regular',
        source: 'nofluff',
        postedLabel: '2 dni temu',
        description: 'Praca przy aplikacji webowej full-stack z wykorzystaniem Angular i Node.js.'
      },
      {
        id: 4,
        title: 'Senior Java Developer',
        company: 'NextGen Apps',
        location: 'Poznań',
        workMode: 'remote',
        contractType: 'b2b',
        salaryMin: 22000,
        salaryMax: 30000,
        technologies: ['java', 'sql', 'aws', 'hibernate'],
        roles: ['backend', 'architecture'],
        seniority: 'Senior',
        source: 'linkedin',
        postedLabel: 'Dzisiaj',
        description: 'Projektowanie i rozwój skalowalnych usług backendowych.'
      },
      {
        id: 5,
        title: 'Data Analyst',
        company: 'DataBridge',
        location: 'Gdańsk',
        workMode: 'hybrid',
        contractType: 'uop',
        salaryMin: 9000,
        salaryMax: 14000,
        technologies: ['sql', 'python', 'r'],
        roles: ['data', 'business'],
        seniority: 'Junior',
        source: 'olx',
        postedLabel: '3 dni temu',
        description: 'Analiza danych biznesowych i przygotowywanie raportów.'
      },
      {
        id: 6,
        title: 'DevOps Engineer',
        company: 'InfraCore',
        location: 'Katowice',
        workMode: 'remote',
        contractType: 'b2b',
        salaryMin: 18000,
        salaryMax: 26000,
        technologies: ['aws', 'python', 'go'],
        roles: ['devops', 'backend'],
        seniority: 'Senior',
        source: 'pracuj',
        postedLabel: '4 dni temu',
        description: 'Automatyzacja infrastruktury i utrzymanie środowisk chmurowych.'
      },
      {
        id: 7,
        title: 'Mobile Developer',
        company: 'AppMotion',
        location: 'Łódź',
        workMode: 'onsite',
        contractType: 'uop',
        salaryMin: 11000,
        salaryMax: 17000,
        technologies: ['android', 'java', 'ios'],
        roles: ['mobile'],
        seniority: 'Mid / Regular',
        source: 'linkedin',
        postedLabel: '5 dni temu',
        description: 'Tworzenie i rozwój aplikacji mobilnych.'
      },
      {
        id: 8,
        title: 'Junior QA Engineer',
        company: 'TestPoint',
        location: 'Warszawa',
        workMode: 'hybrid',
        contractType: 'uz',
        salaryMin: 6000,
        salaryMax: 9000,
        technologies: ['javascript', 'sql'],
        roles: ['qa'],
        seniority: 'Junior',
        source: 'olx',
        postedLabel: 'Wczoraj',
        description: 'Testowanie aplikacji oraz raportowanie błędów.'
      },
      {
        id: 9,
        title: 'AI/ML Engineer',
        company: 'VisionLabs',
        location: 'Warszawa',
        workMode: 'hybrid',
        contractType: 'b2b',
        salaryMin: 20000,
        salaryMax: 28000,
        technologies: ['python', 'sql', 'aws'],
        roles: ['ai', 'data'],
        seniority: 'Senior',
        source: 'nofluff',
        postedLabel: 'Dzisiaj',
        description: 'Budowa i rozwój rozwiązań opartych o AI/ML oraz analiza danych.'
      },
      {
        id: 10,
        title: 'Business Analyst',
        company: 'ProcessHub',
        location: 'Wrocław',
        workMode: 'hybrid',
        contractType: 'uop',
        salaryMin: 12000,
        salaryMax: 17000,
        technologies: ['sql'],
        roles: ['business', 'system'],
        seniority: 'Mid / Regular',
        source: 'pracuj',
        postedLabel: '2 dni temu',
        description: 'Zbieranie wymagań biznesowych, analiza procesów i współpraca z zespołami IT.'
      },
      {
        id: 11,
        title: 'Embedded Software Engineer',
        company: 'MicroCore',
        location: 'Poznań',
        workMode: 'onsite',
        contractType: 'uop',
        salaryMin: 14000,
        salaryMax: 21000,
        technologies: ['c', 'cpp'],
        roles: ['embedded'],
        seniority: 'Mid / Regular',
        source: 'linkedin',
        postedLabel: '1 dzień temu',
        description: 'Rozwój oprogramowania embedded w C i C++ dla urządzeń przemysłowych.'
      },
      {
        id: 12,
        title: 'React Frontend Developer',
        company: 'PixelForge',
        location: 'Gdynia',
        workMode: 'remote',
        contractType: 'b2b',
        salaryMin: 13000,
        salaryMax: 19000,
        technologies: ['react', 'typescript', 'javascript', 'html'],
        roles: ['frontend', 'ux'],
        seniority: 'Mid / Regular',
        source: 'nofluff',
        postedLabel: 'Wczoraj',
        description: 'Tworzenie nowoczesnych interfejsów frontendowych z naciskiem na UX/UI.'
      }
    ];

    return offers.filter((offer) => this.isSourceAllowed(offer.source));
  }
}