import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, RouterModule],
  templateUrl: './offers.component.html',
  styleUrls: ['./offers.component.css']
})
export class OffersComponent implements OnInit {
  readonly salaryOptions = [
    0, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
    13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 22000,
    25000, 30000, 35000, 40000, 45000, 50000
  ];

  filters: CandidateFilters | null = null;
  cvFileName: string | null = null;

  allOffers: JobOffer[] = [];
  matchedOffers: OfferViewModel[] = [];

  selectedRoles: string[] = [];
  selectedTechnologies: string[] = [];
  selectedSources: string[] = [];

  salaryFrom = 0;
  salaryTo = 0;

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    const navState = history.state as {
      filters?: CandidateFilters;
      cvFileName?: string | null;
    };

    if (!navState?.filters) {
      this.router.navigate(['/']);
      return;
    }

    this.filters = navState.filters;
    this.cvFileName = navState.cvFileName ?? null;

    this.selectedRoles = this.extractSelectedKeys(this.filters.itArea);
    this.selectedTechnologies = this.extractSelectedKeys(this.filters.technologies);
    this.selectedSources = this.extractSelectedKeys(this.filters.jobSites);

    this.salaryFrom = this.salaryOptions[this.filters.salaryFromIndex] ?? 0;
    this.salaryTo = this.salaryOptions[this.filters.salaryToIndex] ?? 0;

    this.allOffers = this.getMockOffers();
    this.matchedOffers = this.getMatchedOffers();
  }

  private extractSelectedKeys(group: Record<string, boolean>): string[] {
    return Object.entries(group)
      .filter(([, value]) => value)
      .map(([key]) => key);
  }

  private getMatchedOffers(): OfferViewModel[] {
    if (!this.filters) return [];

    return this.allOffers
      .map((offer) => this.toOfferViewModel(offer))
      .filter((offer) => offer.matchScore >= this.filters!.matchPrecision)
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  private toOfferViewModel(offer: JobOffer): OfferViewModel {
    const matchedTech = offer.technologies.filter((tech) =>
      this.selectedTechnologies.includes(tech)
    );

    const matchedRoles = offer.roles.filter((role) =>
      this.selectedRoles.includes(role)
    );

    const score = this.calculateMatchScore(offer, matchedTech, matchedRoles);

    return {
      ...offer,
      matchScore: score,
      matchedTech,
      matchedRoles
    };
  }

  private calculateMatchScore(
    offer: JobOffer,
    matchedTech: string[],
    matchedRoles: string[]
  ): number {
    if (!this.filters) return 0;

    let score = 0;

    if (matchedRoles.length > 0) {
      score += 30;
    }

    if (offer.seniority === this.filters.seniority) {
      score += 25;
    } else if (
      this.filters.seniority === 'Mid / Regular' &&
      (offer.seniority === 'Junior' || offer.seniority === 'Senior')
    ) {
      score += 10;
    }

    const selectedTechCount = this.selectedTechnologies.length;
    if (selectedTechCount > 0) {
      const techScore = Math.min((matchedTech.length / selectedTechCount) * 30, 30);
      score += techScore;
    }

    if (offer.contractType === this.filters.contractType) {
      score += 5;
    }

    const salaryMatches =
      offer.salaryMax >= this.salaryFrom && offer.salaryMin <= this.salaryTo;

    if (salaryMatches) {
      score += 10;
    }

    return Math.round(Math.min(score, 100));
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

  private isSourceAllowed(source: string): boolean {
    if (!this.filters) return true;

    const chosenSources = this.extractSelectedKeys(this.filters.jobSites);

    if (chosenSources.length === 0) {
      return true;
    }

    return chosenSources.includes(source);
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
}