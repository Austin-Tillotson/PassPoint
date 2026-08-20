import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthenticatedUser {
  username: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://localhost:7063/api/auth';

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