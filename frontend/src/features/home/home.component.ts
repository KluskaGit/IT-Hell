import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { LookupsApiService } from '../../app/core/services/lookups-api.service';
import {
  SENIORITY_OPTIONS, EXP_LEVEL_TO_SENIORITY, Seniority,
  WORK_MODE_OPTIONS, WORK_TYPE_TO_MODE, WorkMode,
  SITE_OPTIONS, techNameToKey, specNameToKey
} from '../../app/core/services/job-offers-api.service';

type LookupItem = { key: string; label: string; id: string };

const FALLBACK_ROLES: LookupItem[] = [
  { key: 'backend', label: 'Backend', id: '' }, { key: 'frontend', label: 'Frontend', id: '' },
  { key: 'fullstack', label: 'Full-stack', id: '' }, { key: 'mobile', label: 'Mobile', id: '' },
  { key: 'architecture', label: 'Architecture', id: '' }, { key: 'devops', label: 'DevOps', id: '' },
  { key: 'data', label: 'Data analytics & BI', id: '' }, { key: 'bigdata', label: 'Big Data / Data Science', id: '' },
  { key: 'embedded', label: 'Embedded', id: '' }, { key: 'qa', label: 'QA/Testing', id: '' },
  { key: 'security', label: 'Security', id: '' }, { key: 'helpdesk', label: 'Helpdesk', id: '' },
  { key: 'product', label: 'Product Management', id: '' }, { key: 'project', label: 'Project Management', id: '' },
  { key: 'agile', label: 'Agile', id: '' }, { key: 'ux', label: 'UX/UI', id: '' },
  { key: 'business', label: 'Business analytics', id: '' }, { key: 'system', label: 'System analytics', id: '' },
  { key: 'sap', label: 'SAP&ERP', id: '' }, { key: 'admin', label: 'IT admin', id: '' }, { key: 'ai', label: 'AI/ML', id: '' },
];

const FALLBACK_TECHS: LookupItem[] = [
  { key: 'javascript', label: 'JavaScript', id: '' }, { key: 'html', label: 'HTML', id: '' },
  { key: 'sql', label: 'SQL', id: '' }, { key: 'python', label: 'Python', id: '' }, { key: 'java', label: 'Java', id: '' },
  { key: 'csharp', label: 'C#', id: '' }, { key: 'php', label: 'PHP', id: '' }, { key: 'cpp', label: 'C++', id: '' },
  { key: 'typescript', label: 'TypeScript', id: '' }, { key: 'go', label: 'Go', id: '' }, { key: 'c', label: 'C', id: '' },
  { key: 'dotnet', label: '.NET', id: '' }, { key: 'react', label: 'React.js', id: '' }, { key: 'angular', label: 'Angular', id: '' },
  { key: 'android', label: 'Android', id: '' }, { key: 'aws', label: 'AWS', id: '' }, { key: 'ios', label: 'iOS', id: '' },
  { key: 'rust', label: 'Rust', id: '' }, { key: 'r', label: 'R', id: '' }, { key: 'nodejs', label: 'Node.js', id: '' },
  { key: 'ruby', label: 'Ruby on Rails', id: '' }, { key: 'hibernate', label: 'Hibernate', id: '' },
];

const STORAGE_KEY = 'cv_analizer_candidate_filters';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  candidateForm!: FormGroup;
  selectedFile: File | null = null;
  isDragging = false;
  isScanning = false;
  scanProgress = 0;
  scanStatus = '';
  scanComplete = false;
  showAllSpecs = false;
  showAllTech = false;
  isLoadingLookups = true;

  availableRoles: LookupItem[] = [];
  availableTechs: LookupItem[] = [];

  salaryOptions = [
    0, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
    13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 22000,
    25000, 30000, 35000, 40000, 45000, 50000
  ];
  maxSalaryIndex = this.salaryOptions.length - 1;

  readonly seniorityOptions = SENIORITY_OPTIONS;
  readonly workModeOptions = WORK_MODE_OPTIONS;
  readonly siteOptions = SITE_OPTIONS;

  readonly techIconClass: Record<string, string> = {
    javascript: 'devicon-javascript-plain colored', html: 'devicon-html5-plain colored',
    sql: 'devicon-azuresqldatabase-plain colored', python: 'devicon-python-plain colored',
    java: 'devicon-java-plain colored', csharp: 'devicon-csharp-plain colored',
    php: 'devicon-php-plain colored', cpp: 'devicon-cplusplus-plain colored',
    typescript: 'devicon-typescript-plain colored', go: 'devicon-go-original-wordmark colored',
    c: 'devicon-c-plain colored', dotnet: 'devicon-dot-net-plain colored',
    react: 'devicon-react-original colored', angular: 'devicon-angularjs-plain colored',
    android: 'devicon-android-plain colored', aws: 'devicon-amazonwebservices-plain-wordmark colored',
    ios: 'devicon-apple-original', rust: 'devicon-rust-plain',
    nodejs: 'devicon-nodejs-plain colored', ruby: 'devicon-rails-plain colored',
    hibernate: 'devicon-hibernate-plain colored',
  };

  private expLevelIdsBySeniority: Partial<Record<Seniority, string[]>> = {};
  private workTypeIdsByMode: Partial<Record<WorkMode, string[]>> = {};

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly lookupsApi: LookupsApiService
  ) {}

  ngOnInit(): void {
    this.loadLookups();
  }

  private loadLookups(): void {
    forkJoin({
      expLevels: this.lookupsApi.getExperienceLevels(),
      workTypes: this.lookupsApi.getWorkTypes(),
      specs: this.lookupsApi.getSpecializations(),
      techs: this.lookupsApi.getTechnologies(),
    }).subscribe({
      next: ({ expLevels, workTypes, specs, techs }) => {
        this.expLevelIdsBySeniority = {};
        for (const level of expLevels) {
          const seniority = EXP_LEVEL_TO_SENIORITY[level.name];
          if (seniority) {
            const arr = this.expLevelIdsBySeniority[seniority] ?? [];
            arr.push(level.id);
            this.expLevelIdsBySeniority[seniority] = arr;
          }
        }
        this.workTypeIdsByMode = {};
        for (const wt of workTypes) {
          const mode = WORK_TYPE_TO_MODE[wt.name];
          if (mode) {
            const arr = this.workTypeIdsByMode[mode] ?? [];
            arr.push(wt.id);
            this.workTypeIdsByMode[mode] = arr;
          }
        }
        const seen = new Set<string>();
        this.availableRoles = specs
          .map(s => ({ key: specNameToKey(s.name), label: s.name, id: s.id }))
          .filter(r => { if (seen.has(r.key)) return false; seen.add(r.key); return true; });
        const seenTech = new Set<string>();
        this.availableTechs = techs
          .map(t => ({ key: techNameToKey(t.name), label: t.name, id: t.id }))
          .filter(t => { if (seenTech.has(t.key)) return false; seenTech.add(t.key); return true; });
        this.isLoadingLookups = false;
        this.initForm();
        this.setupStudentValidation();
      },
      error: () => {
        this.availableRoles = FALLBACK_ROLES;
        this.availableTechs = FALLBACK_TECHS;
        this.isLoadingLookups = false;
        this.initForm();
        this.setupStudentValidation();
      },
    });
  }

  private initForm(): void {
    const saved = this.loadSavedFilters();

    const itAreaGroup: Record<string, boolean> = {};
    for (const role of this.availableRoles) {
      itAreaGroup[role.key] = saved?.itArea?.[role.key] ?? false;
    }
    if (!saved && itAreaGroup['backend'] !== undefined) itAreaGroup['backend'] = true;

    const techGroup: Record<string, boolean> = {};
    for (const tech of this.availableTechs) {
      techGroup[tech.key] = saved?.technologies?.[tech.key] ?? false;
    }

    const jobSitesGroup: Record<string, boolean> = {};
    for (const site of SITE_OPTIONS) {
      jobSitesGroup[site.value] = saved?.jobSites?.[site.value] ?? true;
    }

    this.candidateForm = this.fb.group({
      itArea: this.fb.group(itAreaGroup),
      seniority: [saved?.seniority ?? 'Junior', Validators.required],
      technologies: this.fb.group(techGroup),
      englishLevel: [saved?.englishLevel ?? 'B2'],
      isStudent: [saved?.isStudent ?? false],
      studyYear: [{ value: saved?.studyYear ?? null, disabled: true }],
      salaryFromIndex: [saved?.salaryFromIndex ?? 16],
      salaryToIndex: [saved?.salaryToIndex ?? 22],
      contractType: [saved?.contractType ?? 'uop'],
      noticePeriod: [saved?.noticePeriod ?? '1_month'],
      workMode: this.fb.group({
        remote: [saved?.workMode?.remote ?? true],
        hybrid: [saved?.workMode?.hybrid ?? true],
        onsite: [saved?.workMode?.onsite ?? false],
      }),
      jobSites: this.fb.group(jobSitesGroup),
      matchPrecision: [saved?.matchPrecision ?? 75],
    });
  }

  private loadSavedFilters(): any {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private saveFilters(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.candidateForm.getRawValue()));
    } catch { /* ignore */ }
  }

  get salaryFromValue(): number {
    return this.salaryOptions[Number(this.candidateForm?.get('salaryFromIndex')?.value) || 0];
  }

  get salaryToValue(): number {
    return this.salaryOptions[Number(this.candidateForm?.get('salaryToIndex')?.value) || this.maxSalaryIndex];
  }

  checkSalaryRange(type: 'from' | 'to'): void {
    const fromCtrl = this.candidateForm.get('salaryFromIndex');
    const toCtrl = this.candidateForm.get('salaryToIndex');
    if (!fromCtrl || !toCtrl) return;
    const from = Number(fromCtrl.value);
    const to = Number(toCtrl.value);
    if (from >= to) {
      if (type === 'from') toCtrl.setValue(from + 1, { emitEvent: false });
      else fromCtrl.setValue(to - 1, { emitEvent: false });
    }
  }

  getSalaryProgessPercent(): number {
    const from = Number(this.candidateForm?.get('salaryFromIndex')?.value) || 0;
    const to = Number(this.candidateForm?.get('salaryToIndex')?.value) || this.maxSalaryIndex;
    return ((to - from) / this.maxSalaryIndex) * 100;
  }

  getSalaryProgessLeft(): number {
    const from = Number(this.candidateForm?.get('salaryFromIndex')?.value) || 0;
    return (from / this.maxSalaryIndex) * 100;
  }

  getTechIcon(key: string): string | null {
    return this.techIconClass[key] ?? null;
  }

  getVisibleRoles(): LookupItem[] {
    return this.showAllSpecs ? this.availableRoles : this.availableRoles.slice(0, 8);
  }

  getVisibleTechs(): LookupItem[] {
    return this.showAllTech ? this.availableTechs : this.availableTechs.slice(0, 10);
  }

  private handleFile(file: File): void {
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const fileName = file.name.toLocaleLowerCase();
    if (!allowedExtensions.some(ext => fileName.endsWith(ext))) {
      alert('Dozwolone są tylko pliki PDF, DOC, DOCX!');
      return;
    }
    this.selectedFile = file;
    this.simulateScanning();
  }

  private simulateScanning(): void {
    this.isScanning = true; this.scanProgress = 0; this.scanStatus = 'Analiza CV...';
    setTimeout(() => { this.scanProgress = 35; }, 200);
    setTimeout(() => { this.scanProgress = 70; }, 500);
    setTimeout(() => {
      this.scanProgress = 100; this.scanStatus = 'Zakończono!';
      setTimeout(() => { this.isScanning = false; this.scanComplete = true; this.autoFillForm(); }, 150);
    }, 800);
  }

  private autoFillForm(): void {
    this.candidateForm.patchValue({
      itArea: { backend: true, architecture: true },
      seniority: 'Senior',
      technologies: { java: true, sql: true, aws: true, python: false },
      salaryFromIndex: 18,
      salaryToIndex: 22,
    });
    this.saveFilters();
  }

  removeFile(e: Event): void {
    e.stopPropagation();
    this.selectedFile = null;
    this.scanComplete = false;
    const saved = this.loadSavedFilters();
    if (saved) {
      this.candidateForm.patchValue(saved);
    }
  }

  submitAndSignup(): void {
    if (this.candidateForm.invalid) { this.candidateForm.markAllAsTouched(); return; }
    this.saveFilters();
    this.router.navigate(['/login']);
  }

  onSubmit(): void {
    if (this.candidateForm.invalid) {
      this.candidateForm.markAllAsTouched();
      return;
    }
    this.saveFilters();

    const formValue = this.candidateForm.getRawValue();
    const selectedSeniority = formValue.seniority as Seniority;
    const expLevelIds = this.expLevelIdsBySeniority[selectedSeniority] ?? [];

    const workModeGroup = formValue.workMode as Record<string, boolean>;
    const workTypeIds = (Object.entries(workModeGroup) as [WorkMode, boolean][])
      .filter(([, selected]) => selected)
      .flatMap(([mode]) => this.workTypeIdsByMode[mode] ?? []);

    this.router.navigate(['/offers'], {
      state: {
        filters: { ...formValue, expLevelIds, workTypeIds },
        cvFileName: this.selectedFile?.name ?? null,
      },
    });
  }

  private setupStudentValidation(): void {
    this.candidateForm.get('isStudent')?.valueChanges.subscribe((isStudent: boolean) => {
      const studyYearControl = this.candidateForm.get('studyYear');
      if (isStudent) {
        studyYearControl?.enable();
        studyYearControl?.setValidators([Validators.required, Validators.min(1), Validators.max(5)]);
      } else {
        studyYearControl?.disable();
        studyYearControl?.clearValidators();
        studyYearControl?.setValue(null);
      }
      studyYearControl?.updateValueAndValidity();
    });
  }

  onDragOver(e: DragEvent): void { e.preventDefault(); this.isDragging = true; }
  onDragLeave(e: DragEvent): void { e.preventDefault(); this.isDragging = false; }
  onDrop(e: DragEvent): void {
    e.preventDefault(); this.isDragging = false;
    if (e.dataTransfer?.files.length) this.handleFile(e.dataTransfer.files[0]);
  }
  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) this.handleFile(input.files[0]);
  }

  get isAuthenticated() { return this.authService.isAuthenticated; }
  get username() { return this.authService.username; }
  async logout(): Promise<void> { await this.authService.logout(); }
}
