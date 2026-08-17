import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface AuthCredentials {
  username: string;
  password: string;
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
}