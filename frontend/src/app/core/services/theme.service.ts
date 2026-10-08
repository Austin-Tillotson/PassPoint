import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly selected = signal<Theme>(
    this.document.documentElement.dataset['theme'] === 'dark' ? 'dark' : 'light',
  );
  readonly theme = this.selected.asReadonly();
  readonly logo = computed(() =>
    this.theme() === 'dark' ? 'passpoint-icon-dark.png' : 'passpoint-icon.png',
  );

  toggle(): void {
    const theme = this.theme() === 'light' ? 'dark' : 'light';
    this.selected.set(theme);
    this.document.documentElement.dataset['theme'] = theme;
    try {
      this.document.defaultView?.localStorage.setItem('passpoint-theme', theme);
    } catch {
      // The switch still works for this visit when storage is blocked.
    }
  }
}
