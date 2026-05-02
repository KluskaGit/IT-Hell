import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="bg-white shadow">
      <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900 cursor-pointer" routerLink="/">IT-Hell</h1>
        <nav class="flex space-x-4 items-center">
          @if (authService.hasValidToken()) {
            <a routerLink="/profile" class="text-gray-700 hover:text-blue-600 font-medium cursor-pointer">Mój Profil</a>
            <button (click)="logout()" class="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">
              Wyloguj
            </button>
          } @else {
            <button (click)="login()" class="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
              Zaloguj do IT-Hell
            </button>
          }
        </nav>
      </div>
    </header>
    <main>
      <div class="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <!-- Content will be injected here via router -->
        <router-outlet></router-outlet>
      </div>
    </main>
  `
})
export class AppComponent {
  authService = inject(AuthService);
  title = 'frontend';

  login() {
    this.authService.login();
  }

  logout() {
    this.authService.logout();
  }
}
