import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { UserProfileResponse, UserProfileUpdate, UserRead } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class ProfileApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  public getMe(): Observable<UserRead> {
    return this.http.get<UserRead>(`${this.apiUrl}/me`);
  }

  public getMyProfile(): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(`${this.apiUrl}/me/profile`);
  }

  public updateMyProfile(updatePayload: UserProfileUpdate): Observable<UserProfileResponse> {
    return this.http.put<UserProfileResponse>(`${this.apiUrl}/me/profile`, updatePayload);
  }
}