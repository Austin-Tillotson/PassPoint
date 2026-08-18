import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { NewPasswordEntry, PasswordEntry } from '../models/password-entry';

@Injectable({
  providedIn: 'root',
})
export class PasswordEntriesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://localhost:7063/api/password-entries';

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
}