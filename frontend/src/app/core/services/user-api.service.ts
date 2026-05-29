import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// raw_cv: null oznacza że użytkownik nie ma wgranego CV w backendzie
export interface UserMeDto {
  id_keycloak: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfileDto {
  id: string;
  user_id: string;
  raw_cv: string | null;
  exp_level: {
    id: string;
    name: string;
  } | null;
  technologies: Array<{
    id: string;
    name: string;
  }>;
}

export interface UserProfileUpdateDto {
  exp_level_id?: string | null;
  technology_ids?: string[] | null;
}

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users`;

  getMe(): Promise<UserMeDto> {
    return firstValueFrom(this.http.get<UserMeDto>(`${this.base}/me`));
  }

  getMyProfile(): Promise<UserProfileDto> {
    return firstValueFrom(this.http.get<UserProfileDto>(`${this.base}/me/profile`));
  }

  updateMyProfile(payload: UserProfileUpdateDto): Promise<UserProfileDto> {
    return firstValueFrom(this.http.put<UserProfileDto>(`${this.base}/me/profile`, payload));
  }
}
