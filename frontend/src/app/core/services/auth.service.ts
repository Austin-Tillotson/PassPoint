import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthenticatedUser {
  username: string;
  isDemo?: boolean;
  demoExpiresAtUtc?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/auth`;

  startDemo(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/demo`, {}, { withCredentials: true });
  }

  resetDemo(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/demo/reset`, {}, { withCredentials: true });
  }

  register(credentials: AuthCredentials): Observable<{ username: string }> {
    return this.http.post<{ username: string }>(
      `${this.apiUrl}/register`,
      credentials,
    );
  }

  login(credentials: AuthCredentials): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/login`, credentials, {
      withCredentials: true,
    });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/logout`, {}, {
      withCredentials: true,
    });
  }

  getCurrentUser(): Observable<AuthenticatedUser> {
    return this.http.get<AuthenticatedUser>(`${this.apiUrl}/me`, {
      withCredentials: true,
    });
  }
}
