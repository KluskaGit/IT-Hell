import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;

  constructor(private readonly fb: FormBuilder, private readonly router: Router) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // Symulacja logowania Social (Google, GitHub, LinkedIn)
// Metoda do logowania Social (Google, GitHub, LinkedIn)
// todo: Odkoduj to, gdy kolega z backendu da Ci gotowe linki  
loginWithSocial(provider: string): void {
    // 1. BEZPIECZNIK NA TERAZ: 
    // Wyświetla tylko powiadomienie w konsoli, żeby nic nie wybuchło.
    console.log(`[Frontend] Kliknięto: ${provider}. Czekam na endpointy od backendu!`);

    // ========================================================================
    // 2. DOCELOWY KOD (Odkoduj to, gdy kolega z backendu da Ci gotowe linki):
    // ========================================================================
    
    /*
    const providerLower = provider.toLowerCase(); // zamieni "Google" na "google" itd.
    
    // Zapytaj kolegę, jaki jest adres Waszego API (np. http://localhost:8080/api)
    const backendUrl = 'TUTAJ_WPISZ_ADRES_API_OD_KOLEGI'; 

    // To robi "twarde" przekierowanie na serwer backendu
    window.location.href = `${backendUrl}/auth/${providerLower}`;
    */
  }

  // Klasyczne logowanie
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    console.log('Dane logowania:', this.loginForm.value);
    // Po udanym logowaniu wracamy na stronę główną:
    // this.router.navigate(['/']);
  }
}