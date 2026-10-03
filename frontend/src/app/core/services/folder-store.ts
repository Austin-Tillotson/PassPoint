import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, finalize } from 'rxjs';
import { Folder, FoldersService } from './folders.service';

// Scoped to the signed-in layout so one account's folders cannot survive logout.
@Injectable()
export class FolderStore {
  private readonly api = inject(FoldersService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly folders = signal<Folder[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly selection = signal('all');
  readonly passwordCounts = signal<Record<string, number> | null>(null);
  readonly label = computed(() => this.selection() === 'all' ? 'All passwords'
    : this.selection() === 'unfiled' ? 'Unfiled'
    : this.folders().find(folder => folder.id === this.selection())?.name ?? 'Folder');

  constructor() {
    this.readSelection();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.readSelection();
      this.validateSelection();
    });
  }

  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.api.getAll().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: folders => {
        this.folders.set(folders);
        this.loaded.set(true);
        this.validateSelection();
      },
      error: () => this.error.set('Unable to load folders.'),
    });
  }

  private readSelection(): void {
    const params = this.router.parseUrl(this.router.url).queryParams;
    this.selection.set(params['folder'] || (params['collection'] === 'unfiled' ? 'unfiled' : 'all'));
  }

  private validateSelection(): void {
    const id = this.selection();
    if (this.loaded() && !this.error() && id !== 'all' && id !== 'unfiled' &&
        !this.folders().some(folder => folder.id === id)) {
      void this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  }
}
