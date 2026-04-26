// =============================================================================
// USER API SERVICE — SZKIELET POD ENDPOINTY CHRONIONE (Piotrek)
// =============================================================================
// Plik zakomentowany — obecny task obejmuje TYLKO endpointy publiczne.
//
// UWAGA dla Piotrka:
//   Backend NIE udostępnia POST /v1/users/sync. Provisioning użytkownika
//   (JIT) dzieje się automatycznie przy pierwszym wywołaniu dowolnego
//   chronionego endpointu — `get_current_user` wywołuje
//   `auth_service.check_or_create_user()`, który tworzy rekord po pierwszym
//   GET /v1/users/me. Osobny /sync nie jest potrzebny.
//
// Realne chronione endpointy z backendu (api/v1/routers):
//   - GET  /v1/users/me            — profil zalogowanego usera (+ JIT create)
//   - GET  /v1/users/me/profile    — szczegółowy UserProfile
//   - PUT  /v1/users/me/profile    — update profilu
//   - POST /v1/cv/upload/{user_id} — upload CV (uwaga: brak auth na backendzie)
//
// Aby aktywować ten plik: odkomentuj klasę poniżej, dodaj odpowiednie
// metody (np. getMe(), getProfile(), updateProfile()) i podepnij w
// komponentach. Interceptor w app.config.ts dorzuca Bearer token dla /v1/.
// =============================================================================

/*
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users`;

  async getMe(): Promise<unknown> {
    return firstValueFrom(this.http.get(`${this.base}/me`));
  }
}
*/
