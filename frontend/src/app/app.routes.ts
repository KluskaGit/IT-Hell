import { Routes } from '@angular/router';
import { HomeComponent } from '../features/home/home.component';
import { ProfileComponent } from '../features/profile/profile.component';
import { OffersComponent } from '../features/offers/offers.component';
import { LegalComponent } from '../features/legal/legal.component';
import { AboutComponent } from '../features/about/about.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },

  { path: 'login', redirectTo: '', pathMatch: 'full' },
  { path: 'register', redirectTo: '', pathMatch: 'full' },
  { path: 'forgot-password', redirectTo: '', pathMatch: 'full' },

  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'offers', component: OffersComponent },
  { path: 'legal', component: LegalComponent },
  { path: 'about', component: AboutComponent },

  { path: '**', redirectTo: '' }
];
