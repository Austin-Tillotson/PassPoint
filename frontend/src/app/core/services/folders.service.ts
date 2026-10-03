import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface Folder {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class FoldersService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/folders`;
  private readonly options = { withCredentials: true };

  getAll() {
    return this.http.get<Folder[]>(this.url, this.options);
  }

  create(name: string) {
    return this.http.post<Folder>(this.url, { name }, this.options);
  }

  update(id: string, name: string) {
    return this.http.put<Folder>(`${this.url}/${id}`, { name }, this.options);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.url}/${id}`, this.options);
  }
}
