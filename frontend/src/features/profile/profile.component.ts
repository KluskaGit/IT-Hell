import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LookupsApiService } from '../../app/core/services/lookups-api.service';
import {
  SENIORITY_OPTIONS, techNameToKey, specNameToKey, SITE_OPTIONS
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
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  readonly seniorityOptions = SENIORITY_OPTIONS;

  availableRoles: LookupItem[] = [];
  availableTechs: LookupItem[] = [];
  isLoadingLookups = true;
  showAllSpecs = false;
  showAllTech = false;

  user = {
    firstName: 'Jan',
    lastName: 'Kowalski',
    email: 'jan.kowalski@email.com',
    avatarUrl: null as string | null,
    isStudent: false,
    studyYear: null as number | null,
  };

  currentCvFile: string | null = 'Jan_Kowalski_CV_2024.pdf';
  currentCvDate: string = '2 dni temu';
  isDragging = false;

  profileForm!: FormGroup;

  salaryOptions = [
    0, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
    13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 22000,
    25000, 30000, 35000, 40000, 45000, 50000
  ];
  maxSalaryIndex = this.salaryOptions.length - 1;

  salaryGap = {
    userExpected: 20000,
    marketAverage: 18500,
    difference: '+8.1%',
    trend: 'up' as 'up' | 'down' | 'neutral'
  };

  activityLog = [
    { title: 'Java Backend Developer', matchScore: 92, date: '2024-01-15', status: 'excellent' },
    { title: 'Senior Full-Stack Engineer', matchScore: 85, date: '2024-01-14', status: 'good' },
    { title: 'Python Data Engineer', matchScore: 67, date: '2024-01-13', status: 'fair' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly lookupsApi: LookupsApiService
  ) {}

  ngOnInit(): void {
    this.loadLookups();
  }

  private loadLookups(): void {
    forkJoin({
      specs: this.lookupsApi.getSpecializations(),
      techs: this.lookupsApi.getTechnologies(),
    }).subscribe({
      next: ({ specs, techs }) => {
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
    if (!saved) {
      if (itAreaGroup['backend'] !== undefined) itAreaGroup['backend'] = true;
      if (itAreaGroup['architecture'] !== undefined) itAreaGroup['architecture'] = true;
    }

    const techGroup: Record<string, boolean> = {};
    for (const tech of this.availableTechs) {
      techGroup[tech.key] = saved?.technologies?.[tech.key] ?? false;
    }
    if (!saved) {
      if (techGroup['sql'] !== undefined) techGroup['sql'] = true;
      if (techGroup['java'] !== undefined) techGroup['java'] = true;
      if (techGroup['aws'] !== undefined) techGroup['aws'] = true;
    }

    const jobSitesGroup: Record<string, boolean> = {};
    for (const site of SITE_OPTIONS) {
      jobSitesGroup[site.value] = saved?.jobSites?.[site.value] ?? true;
    }

    this.profileForm = this.fb.group({
      firstName: [this.user.firstName, Validators.required],
      lastName: [this.user.lastName, Validators.required],
      isStudent: [saved?.isStudent ?? this.user.isStudent],
      studyYear: [{ value: saved?.studyYear ?? this.user.studyYear, disabled: true }],
      itArea: this.fb.group(itAreaGroup),
      seniority: [saved?.seniority ?? 'Senior', Validators.required],
      technologies: this.fb.group(techGroup),
      englishLevel: [saved?.englishLevel ?? 'B2'],
      salaryFromIndex: [saved?.salaryFromIndex ?? 18],
      salaryToIndex: [saved?.salaryToIndex ?? 22],
      contractType: [saved?.contractType ?? 'uop'],
      noticePeriod: [saved?.noticePeriod ?? '1_month'],
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profileForm.getRawValue()));
    } catch { /* ignore */ }
  }

  getVisibleRoles(): LookupItem[] {
    return this.showAllSpecs ? this.availableRoles : this.availableRoles.slice(0, 8);
  }

  getVisibleTechs(): LookupItem[] {
    return this.showAllTech ? this.availableTechs : this.availableTechs.slice(0, 10);
  }

  private setupStudentValidation(): void {
    this.profileForm.get('isStudent')?.valueChanges.subscribe((isStudent: boolean) => {
      const ctrl = this.profileForm.get('studyYear');
      if (isStudent) {
        ctrl?.enable();
        ctrl?.setValidators([Validators.required, Validators.min(1), Validators.max(5)]);
      } else {
        ctrl?.disable();
        ctrl?.clearValidators();
        ctrl?.setValue(null);
      }
      ctrl?.updateValueAndValidity();
      this.user.isStudent = isStudent;
    });
  }

  get salaryFromValue(): number {
    return this.salaryOptions[Number(this.profileForm?.get('salaryFromIndex')?.value) || 0];
  }

  get salaryToValue(): number {
    return this.salaryOptions[Number(this.profileForm?.get('salaryToIndex')?.value) || this.maxSalaryIndex];
  }

  checkSalaryRange(type: 'from' | 'to'): void {
    const fromCtrl = this.profileForm.get('salaryFromIndex');
    const toCtrl = this.profileForm.get('salaryToIndex');
    if (!fromCtrl || !toCtrl) return;
    const from = Number(fromCtrl.value);
    const to = Number(toCtrl.value);
    if (from >= to) {
      if (type === 'from') toCtrl.setValue(from + 1, { emitEvent: false });
      else fromCtrl.setValue(to - 1, { emitEvent: false });
    }
  }

  getSalaryProgressPercent(): number {
    const from = Number(this.profileForm?.get('salaryFromIndex')?.value) || 0;
    const to = Number(this.profileForm?.get('salaryToIndex')?.value) || this.maxSalaryIndex;
    return ((to - from) / this.maxSalaryIndex) * 100;
  }

  getSalaryProgressLeft(): number {
    const from = Number(this.profileForm?.get('salaryFromIndex')?.value) || 0;
    return (from / this.maxSalaryIndex) * 100;
  }

  onDragOver(e: DragEvent): void { e.preventDefault(); this.isDragging = true; }
  onDragLeave(e: DragEvent): void { e.preventDefault(); this.isDragging = false; }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = false;
    if (e.dataTransfer?.files.length) this.handleFile(e.dataTransfer.files[0]);
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) this.handleFile(input.files[0]);
  }

  private handleFile(file: File): void {
    const allowed = ['.pdf', '.doc', '.docx'];
    const name = file.name.toLowerCase();
    if (!allowed.some(ext => name.endsWith(ext))) {
      alert('Dozwolone są tylko pliki PDF, DOC, DOCX!');
      return;
    }
    this.currentCvFile = file.name;
    this.currentCvDate = 'Właśnie teraz';
  }

  removeCv(): void {
    this.currentCvFile = null;
    this.currentCvDate = '';
  }

  onSave(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.saveFilters();
    console.log('Zapisano profil:', {
      ...this.profileForm.value,
      salaryFrom: this.salaryFromValue,
      salaryTo: this.salaryToValue,
    });
  }

  onLogout(): void {
    this.router.navigate(['/login']);
  }

  getMatchScoreClass(score: number): string {
    if (score >= 85) return 'score-excellent';
    if (score >= 70) return 'score-good';
    return 'score-fair';
  }
}
