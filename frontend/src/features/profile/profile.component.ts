/**
 * ============================================================================
 * PROJEKT: CV_ANALIZER — User Profile Dashboard
 * PLIK: profile.component.ts
 * ============================================================================
 *
 * OPIS:
 * Zaawansowany dashboard profilu użytkownika. Standalone Angular Component
 * z Reactive Forms, Drag & Drop CV upload, Career Analytics (Salary Gap),
 * Activity Log i AI Match Precision slider.
 *
 * ARCHITEKTURA:
 * - Standalone Component (bez NgModules)
 * - ReactiveFormsModule dla preferencji (seniority, salary, AI precision)
 * - Spójność wizualna i logiczna z HomeComponent (pills, salary slider)
 * - Mobile-first responsive grid (1 col mobile → 2 col desktop)
 *
 * STRUKTURA:
 * 1. IMPORTS & DECORATOR
 * 2. PROPERTIES — dane użytkownika, formularz, pliki, analityka
 * 3. LIFECYCLE — ngOnInit
 * 4. FORM BUILDER — initForm()
 * 5. SALARY LOGIC — dual slider z index-based array
 * 6. DRAG & DROP — upload CV z walidacją rozszerzeń
 * 7. TOGGLE HELPERS — pills expand/collapse
 * 8. ACTIONS — save, logout
 * ============================================================================
 */
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  /* ─── User Data (mock — docelowo z backendu) ─── */
  user = {
    firstName: 'Jan',
    lastName: 'Kowalski',
    email: 'jan.kowalski@email.com',
    avatarUrl: null as string | null,
    isStudent: false,
    studyYear: null as number | null,
  };

  /* ─── CV Upload ─── */
  currentCvFile: string | null = 'Jan_Kowalski_CV_2024.pdf';
  currentCvDate: string = '2 dni temu';
  isDragging = false;

  /* ─── Reactive Form ─── */
  profileForm!: FormGroup;

  /* ─── Pills expand/collapse ─── */
  showAllSpecs = false;
  showAllTech = false;

  /* ─── Salary ─── */
  salaryOptions = [
    0, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
    13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 22000,
    25000, 30000, 35000, 40000, 45000, 50000
  ];
  maxSalaryIndex = this.salaryOptions.length - 1;

  /* ─── Career Analytics (static mock) ─── */
  salaryGap = {
    userExpected: 20000,
    marketAverage: 18500,
    difference: '+8.1%',
    trend: 'up' as 'up' | 'down' | 'neutral'
  };

  /* ─── Activity Log ─── */
  activityLog = [
    { title: 'Java Backend Developer', matchScore: 92, date: '2024-01-15', status: 'excellent' },
    { title: 'Senior Full-Stack Engineer', matchScore: 85, date: '2024-01-14', status: 'good' },
    { title: 'Python Data Engineer', matchScore: 67, date: '2024-01-13', status: 'fair' },
  ];

  constructor(private readonly fb: FormBuilder, private readonly router: Router) {}

  ngOnInit(): void {
    this.initForm();
    this.setupStudentValidation();
  }

  /* ═══════════════════════════════════════════════════
   * FORM BUILDER
   * ═══════════════════════════════════════════════════ */
  private initForm(): void {
    this.profileForm = this.fb.group({
      firstName: [this.user.firstName, Validators.required],
      lastName: [this.user.lastName, Validators.required],
      isStudent: [this.user.isStudent],
      studyYear: [{ value: this.user.studyYear, disabled: true }],

      /* Roles (IT Areas) */
      itArea: this.fb.group({
        backend: [true], frontend: [false], fullstack: [false], mobile: [false],
        architecture: [true], devops: [false], gamedev: [false], data: [false],
        bigdata: [false], embedded: [false], qa: [false], security: [false],
        helpdesk: [false], product: [false], project: [false], agile: [false],
        ux: [false], business: [false], system: [false], sap: [false], admin: [false], ai: [false]
      }),

      seniority: ['Senior', Validators.required],

      technologies: this.fb.group({
        javascript: [false], html: [false], sql: [true], python: [false], java: [true],
        csharp: [false], php: [false], cpp: [false], typescript: [false], go: [false],
        c: [false], dotnet: [false], react: [false], angular: [false], android: [false],
        aws: [true], ios: [false], rust: [false], r: [false], nodejs: [false],
        ruby: [false], hibernate: [false]
      }),

      englishLevel: ['B2'],

      /* Finance */
      salaryFromIndex: [18],
      salaryToIndex: [22],
      contractType: ['uop'],
      noticePeriod: ['1_month'],

      /* AI */
      matchPrecision: [75]
    });
  }

  /* ═══════════════════════════════════════════════════
   * STUDENT VALIDATION
   * ═══════════════════════════════════════════════════ */
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

  /* ═══════════════════════════════════════════════════
   * SALARY SLIDER LOGIC (identyczna z HomeComponent)
   * ═══════════════════════════════════════════════════ */
  get salaryFromValue(): number {
    return this.salaryOptions[Number(this.profileForm.get('salaryFromIndex')?.value) || 0];
  }

  get salaryToValue(): number {
    return this.salaryOptions[Number(this.profileForm.get('salaryToIndex')?.value) || this.maxSalaryIndex];
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
    const from = Number(this.profileForm.get('salaryFromIndex')?.value) || 0;
    const to = Number(this.profileForm.get('salaryToIndex')?.value) || this.maxSalaryIndex;
    return ((to - from) / this.maxSalaryIndex) * 100;
  }

  getSalaryProgressLeft(): number {
    const from = Number(this.profileForm.get('salaryFromIndex')?.value) || 0;
    return (from / this.maxSalaryIndex) * 100;
  }

  /* ═══════════════════════════════════════════════════
   * DRAG & DROP CV
   * ═══════════════════════════════════════════════════ */
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

  /* ═══════════════════════════════════════════════════
   * ACTIONS
   * ═══════════════════════════════════════════════════ */
  onSave(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    console.log('💾 Zapisano profil:', {
      ...this.profileForm.value,
      salaryFrom: this.salaryFromValue,
      salaryTo: this.salaryToValue
    });
    // TODO: POST na backend
  }

  onLogout(): void {
    console.log('🚪 Wylogowano');
    this.router.navigate(['/login']);
  }

  /* ═══════════════════════════════════════════════════
   * HELPERS
   * ═══════════════════════════════════════════════════ */
  getMatchScoreClass(score: number): string {
    if (score >= 85) return 'score-excellent';
    if (score >= 70) return 'score-good';
    return 'score-fair';
  }
}
