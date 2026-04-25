import { Routes } from '@angular/router';
import { HomeComponent } from '../features/home/home.component';
import { LoginComponent } from '../features/auth/login/login.component';
import { RegisterComponent } from '../features/auth/register/register.component';
import { ForgotPasswordComponent } from '../features/auth/forgot-password/forgot-password.component';
import { ProfileComponent } from '../features/profile/profile.component';
import { OffersComponent } from '../features/offers/offers.component';
import { LegalComponent } from '../features/legal/legal.component';
import { AboutComponent } from '../features/about/about.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'offers', component: OffersComponent },
  { path: 'legal', component: LegalComponent },
  { path: 'about', component: AboutComponent },
];
