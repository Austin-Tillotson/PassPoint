import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

import type { NewPasswordEntry, PasswordEntry } from '../models/password-entry';

@Injectable({
  providedIn: 'root',
})
export class PasswordEntriesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/password-entries`;

  getAll(): Observable<PasswordEntry[]> {
    return this.http.get<PasswordEntry[]>(this.apiUrl, {
      withCredentials: true,
    });
  }

  create(entry: NewPasswordEntry): Observable<PasswordEntry> {
    return this.http.post<PasswordEntry>(this.apiUrl, entry, {
      withCredentials: true,
    });
  }

  update(id: string, entry: NewPasswordEntry): Observable<PasswordEntry> {
    return this.http.put<PasswordEntry>(`${this.apiUrl}/${id}`, entry, {
      withCredentials: true,
    });
  }

  setFavorite(id: string, isFavorite: boolean): Observable<{ id: string; isFavorite: boolean }> {
    return this.http.put<{ id: string; isFavorite: boolean }>(
      `${this.apiUrl}/${id}/favorite`,
      { isFavorite },
      { withCredentials: true },
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      withCredentials: true,
    });
  }
}
