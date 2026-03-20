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
 * 1. IMPORTS & DECORATOR    - Wymagane moduły Angulara i konfiguracja @Component
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
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  candidateForm!: FormGroup;
  selectedFile: File | null = null;
  isDragging = false;

  // Zmienne do skanera AI
  isScanning = false;
  scanProgress = 0;
  scanStatus = '';
  scanComplete = false;

  // Suwak płacowy
  minSalaryAllowed = 0;
  maxSalaryAllowed = 50000;
  salaryStep = 500;

  // Flagi zwijania sekcji
  showAllSpecs = false;
  showAllTech = false;

  constructor(private readonly fb: FormBuilder, private readonly router: Router) {}

  ngOnInit(): void {
    this.initForm();
    this.setupStudentValidation();
  }

  private initForm(): void {
    this.candidateForm = this.fb.group({
      itArea: ['Backend', Validators.required],
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

      salaryFrom: [22000, [Validators.min(this.minSalaryAllowed), Validators.max(this.maxSalaryAllowed)]],
      salaryTo: [35000, [Validators.min(this.minSalaryAllowed), Validators.max(this.maxSalaryAllowed)]],
      contractType: ['uop'],
      noticePeriod: ['1_month'],
      
      jobSites: this.fb.group({ pracuj: [true], olx: [true], linkedin: [true], nofluff: [false] }),
      matchPrecision: [75] 
    });
  }

  // --- LOGIKA SUWAKA PŁACOWEGO ---
  checkSalaryRange(type: 'from' | 'to'): void {
    const fromCtrl = this.candidateForm.get('salaryFrom');
    const toCtrl = this.candidateForm.get('salaryTo');
    if (!fromCtrl || !toCtrl) return;

    let from = Number(fromCtrl.value) || this.minSalaryAllowed;
    let to = Number(toCtrl.value) || this.maxSalaryAllowed;
    const gap = 1000;

    if (type === 'from' && from >= to) toCtrl.setValue(from + gap, { emitEvent: false });
    else if (type === 'to' && to <= from) fromCtrl.setValue(to - gap, { emitEvent: false });
  }

  getSalaryProgessPercent(): number {
    const from = Number(this.candidateForm.get('salaryFrom')?.value) || this.minSalaryAllowed;
    const to = Number(this.candidateForm.get('salaryTo')?.value) || this.maxSalaryAllowed;
    const range = this.maxSalaryAllowed - this.minSalaryAllowed;
    return Math.max(0, Math.min(100, ((to - from) / range) * 100));
  }

  getSalaryProgessLeft(): number {
    const from = Number(this.candidateForm.get('salaryFrom')?.value) || this.minSalaryAllowed;
    const range = this.maxSalaryAllowed - this.minSalaryAllowed;
    return Math.max(0, Math.min(100, ((from - this.minSalaryAllowed) / range) * 100));
  }

  // --- LOGIKA SKANERA AI ---
  private handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      alert('Obsługujemy tylko format PDF!');
      return;
    }
    this.selectedFile = file;
    this.simulateScanning();
  }

  private simulateScanning() {
    this.isScanning = true;
    this.scanProgress = 0;
    this.scanStatus = 'Inicjalizacja silnika OCR...';

    setTimeout(() => { this.scanProgress = 25; this.scanStatus = 'Ekstrakcja tekstu i bloków semantycznych...'; }, 800);
    setTimeout(() => { this.scanProgress = 55; this.scanStatus = 'Wykrywanie technologii i lat doświadczenia...'; }, 2000);
    setTimeout(() => { this.scanProgress = 85; this.scanStatus = 'Weryfikacja poziomu języków obcych...'; }, 3200);
    setTimeout(() => {
      this.scanProgress = 100;
      this.scanStatus = 'Analiza zakończona! Wypełniam formularz...';
      setTimeout(() => {
        this.isScanning = false;
        this.scanComplete = true;
        this.autoFillForm();
      }, 1000);
    }, 4500);
  }

  private autoFillForm() {
    this.candidateForm.patchValue({
      itArea: 'Backend',
      seniority: 'Mid / Regular',
      technologies: { java: true, sql: true, aws: true, hibernate: true },
      englishLevel: 'C1',
      salaryFrom: 18000,
      salaryTo: 25000,
      matchPrecision: 75
    });
  }

  removeFile(e: Event) {
    e.stopPropagation();
    this.selectedFile = null;
    this.scanComplete = false;
    this.candidateForm.reset({ matchPrecision: 75, contractType: 'uop', englishLevel: 'B2', jobSites: { pracuj: true, olx: true, linkedin: true }, salaryFrom: 22000, salaryTo: 35000 });
  }

  submitAndSignup(): void {
    if (this.candidateForm.invalid) { this.candidateForm.markAllAsTouched(); return; }
    this.router.navigate(['/signup']);
  }
  
  onSubmit(): void {
    if (this.candidateForm.invalid) { this.candidateForm.markAllAsTouched(); return; }
    console.log('Dane do wysłania:', this.candidateForm.value);
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
  onFileSelected(e: any) { if (e.target.files.length) this.handleFile(e.target.files[0]); }
}