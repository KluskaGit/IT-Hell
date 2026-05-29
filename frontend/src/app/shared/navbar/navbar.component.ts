// Pasek nawigacji renderowany na kazdej stronie przez <app-navbar>.
// Obsluguje logowanie i wylogowanie przez AuthService (Keycloak).
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../features/auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent {
  constructor(private readonly authService: AuthService) {}

  // Gettery eksponuja sygnaly Keycloak do szablonu - wywolywane jako isAuthenticated() i username()
  get isAuthenticated() { return this.authService.isAuthenticated; }
  get username()        { return this.authService.username; }

  async login():  Promise<void> { await this.authService.login(); }
  async logout(): Promise<void> { await this.authService.logout(); }
}
