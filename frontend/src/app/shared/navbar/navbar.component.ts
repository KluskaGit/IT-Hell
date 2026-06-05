// Navigation bar rendered on every page via <app-navbar>.
// Handles login and logout through AuthService (Keycloak).
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

  // Getters expose the Keycloak signals to the template - called as isAuthenticated() and username()
  get isAuthenticated() { return this.authService.isAuthenticated; }
  get username()        { return this.authService.username; }

  async login():  Promise<void> { await this.authService.login(); }
  async logout(): Promise<void> { await this.authService.logout(); }
}
