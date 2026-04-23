/**
 * ============================================================================
 * PROJEKT: CV_ANALIZER - Landing Page (Strona Główna)
 * PLIK: home.component.ts
 * ============================================================================
 * * OPIS:
 * Główny kontroler (logika biznesowa) strony startowej aplikacji. 
 * Zarządza stanem rozbudowanego formularza preferencji kandydata, obsługuje 
 * mechanizm przeciągania i upuszczania plików (Drag & Drop) oraz symuluje 
 * asynchroniczny proces analizy CV przez sztuczną inteligencję (OCR).
 * * * ARCHITEKTURA I CECHY:
 * - Standalone Component: Komponent niezależny, importujący wymagane moduły 
 * bezpośrednio (CommonModule, ReactiveFormsModule), bez użycia NgModules.
 * - Reactive Forms: Zaawansowane zarządzanie formularzem przy użyciu 
 * FormBuilder, z dynamiczną walidacją zależną od stanu (np. status studenta).
 * - Nawigacja: Wykorzystanie Angular Router do bezprzeładowaniowych 
 * przekierowań (SPA) na ścieżkę logowania/rejestracji.
 * * * STRUKTURA PLIKU (Użyj Ctrl+F, aby szybko znaleźć):
 * 1. IMPORTS & DECORATOR    - Wymagane moduły Angulara i konfiguracja Component
 * 2. PROPERTIES             - Definicje zmiennych stanu (FormGroup, Skaner, Plik)
 * 3. LIFECYCLE HOOKS        - Metoda ngOnInit inicjalizująca formularz
 * 4. FORM BUILDER           - Metoda initForm() budująca strukturę Reactive Forms
 * 5. AI SCANNER LOGIC       - Asynchroniczna symulacja skanowania OCR i auto-wypełnianie
 * 6. SUBMIT ACTIONS         - Metody submitAndSignup() oraz onSubmit() 
 * 7. DYNAMIC VALIDATION     - Metoda setupStudentValidation() (reakcja na zmiany inputów)
 * 8. DRAG & DROP HANDLERS   - Zdarzenia okna na upuszczenie pliku .pdf
 * ============================================================================
 */
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router'; 
import { constants } from 'node:fs/promises';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule], 
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit 
{
  candidateForm!: FormGroup;
  selectedFile: File | null = null;
  isDragging = false;
  isScanning = false;
  scanProgress = 0;
  scanStatus = '';
  scanComplete = false;
  showAllSpecs = false;
  showAllTech = false;
  

  salaryOptions = [
    0, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 
    13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 22000, 
    25000, 30000, 35000, 40000, 45000, 50000
  ];
  maxSalaryIndex = this.salaryOptions.length - 1;

  constructor(private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setupStudentValidation();
  }

  private initForm(): void {
    this.candidateForm = this.fb.group({
      itArea: this.fb.group({
        backend: [true], frontend: [false], fullstack: [false], mobile: [false],
        architecture: [false], devops: [false], gamedev: [false], data: [false],
        bigdata: [false], embedded: [false], qa: [false], security: [false],
        helpdesk: [false], product: [false], project: [false], agile: [false],
        ux: [false], business: [false], system: [false], sap: [false], admin: [false], ai: [false]
      }),
      seniority: ['Junior', Validators.required],
      technologies: this.fb.group({
        javascript: [false], html: [false], sql: [false], python: [false], java: [false],
        csharp: [false], php: [false], cpp: [false], typescript: [false], go: [false],
        c: [false], dotnet: [false], react: [false], angular: [false], android: [false],
        aws: [false], ios: [false], rust: [false], r: [false], nodejs: [false],
        ruby: [false], hibernate: [false]
      }),
      englishLevel: ['B2'],
      isStudent: [false],
      studyYear: [{ value: null, disabled: true }],
      salaryFromIndex: [16],
      salaryToIndex: [22],
      contractType: ['uop'],
      noticePeriod: ['1_month'],
      jobSites: this.fb.group({ pracuj: [true], olx: [true], linkedin: [true], nofluff: [false] }),
      matchPrecision: [75] 
    });
  }

  get salaryFromValue(): number { 
    return this.salaryOptions[Number(this.candidateForm.get('salaryFromIndex')?.value) || 0]; 
  }
  
  get salaryToValue(): number { 
    return this.salaryOptions[Number(this.candidateForm.get('salaryToIndex')?.value) || this.maxSalaryIndex]; 
  }

  checkSalaryRange(type: 'from' | 'to'): void {
    const fromCtrl = this.candidateForm.get('salaryFromIndex');
    const toCtrl = this.candidateForm.get('salaryToIndex');
    if (!fromCtrl || !toCtrl) return;
    let from = Number(fromCtrl.value);
    let to = Number(toCtrl.value);
    if (from >= to) {
      if (type === 'from') toCtrl.setValue(from + 1, { emitEvent: false });
      else fromCtrl.setValue(to - 1, { emitEvent: false });
    }
  }

  getSalaryProgessPercent(): number {
    const from = Number(this.candidateForm.get('salaryFromIndex')?.value) || 0;
    const to = Number(this.candidateForm.get('salaryToIndex')?.value) || this.maxSalaryIndex;
    return ((to - from) / this.maxSalaryIndex) * 100;
  }

  getSalaryProgessLeft(): number {
    const from = Number(this.candidateForm.get('salaryFromIndex')?.value) || 0;
    return (from / this.maxSalaryIndex) * 100;
  }

   private handleFile(file: File) : void {
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const fileName = file.name.toLocaleLowerCase();

    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) { 
      alert('Dozwolone są tylko pliki PDF, DOC, DOCX!'); 
      return; }

    this.selectedFile = file;
    this.simulateScanning();
  }

  private simulateScanning() {
    this.isScanning = true; this.scanProgress = 0; this.scanStatus = 'Analiza CV...';
    setTimeout(() => { this.scanProgress = 35; }, 800);
    setTimeout(() => { this.scanProgress = 70; }, 1800);
    setTimeout(() => { 
      this.scanProgress = 100; this.scanStatus = 'Zakończono!'; 
      setTimeout(() => { this.isScanning = false; this.scanComplete = true; this.autoFillForm(); }, 800); 
    }, 2800);
  }

  private autoFillForm() : void 
    {
    this.candidateForm.patchValue(
    {
      itArea: 
      { 
        backend: true,
        architecture: true,
      },
      seniority: 'Senior',
      technologies: 
      { 
        java: true, 
        sql: true, 
        aws: true, 
        python: false 
      },
      salaryFromIndex: 18, 
      salaryToIndex: 22    
    });
  }

  removeFile(e: Event) { 
    e.stopPropagation(); this.selectedFile = null; this.scanComplete = false; 
    this.candidateForm.reset({ matchPrecision: 75, salaryFromIndex: 16, salaryToIndex: 22, contractType: 'uop', englishLevel: 'B2', jobSites: { pracuj: true, olx: true, linkedin: true }}); 
  }

  submitAndSignup(): void { 
    if (this.candidateForm.invalid) { this.candidateForm.markAllAsTouched(); return; } 
    this.router.navigate(['/login']); 
  }
  
  onSubmit(): void {
  if (this.candidateForm.invalid) {
    this.candidateForm.markAllAsTouched();
    return;
  }

  this.router.navigate(['/offers'], {
    state: {
      filters: this.candidateForm.getRawValue(),
      cvFileName: this.selectedFile?.name ?? null
    }
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

  onDragOver(e: DragEvent) { e.preventDefault(); this.isDragging = true; }
  onDragLeave(e: DragEvent) { e.preventDefault(); this.isDragging = false; }
  onDrop(e: DragEvent) { e.preventDefault(); this.isDragging = false; if (e.dataTransfer?.files.length) this.handleFile(e.dataTransfer.files[0]); }
  onFileSelected(e: Event) 
  { 
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) 
      {
      this.handleFile(input.files[0]); 
      }
      
  }

  get isAuthenticated() {
  return this.authService.isAuthenticated;
}

  get username() {
  return this.authService.username;
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }
  /*Temporary test method for private endpoint (remove or comment out in production)*/
  async testPrivateEndpoint(): Promise<void> {
    const refreshed = await this.authService.refreshToken(30);
    console.log('REFRESH RESULT:', refreshed);

    const token = this.authService.getToken();
    console.log('CURRENT ACCESS TOKEN:', token);

    const response = await fetch('http://localhost:8000/v1/users/me', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    console.log('STATUS:', response.status);
    console.log('DATA:', data);
  }
}