import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, finalize, Subject } from 'rxjs';
import { Folder, FoldersService } from './folders.service';

// Scoped to the signed-in layout so one account's folders cannot survive logout.
@Injectable()
export class FolderStore {
  private readonly api = inject(FoldersService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly managerOpen = signal(false);
  readonly folderDeleted = new Subject<string>();
  readonly folders = signal<Folder[]>([]);
  readonly folderColors = computed(() => {
    const palette = ['#b57850', '#628568', '#8276ac', '#4c849d', '#ad6585', '#95802e'];
    const folders = [...this.folders()].sort((a, b) => a.id.localeCompare(b.id));
    return Object.fromEntries(folders.map((folder, index) => [folder.id, palette[index % palette.length]]));
  });
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly selection = signal('all');
  readonly passwordCounts = signal<Record<string, number> | null>(null);
  readonly label = computed(() => this.selection() === 'all' ? 'All passwords'
    : this.selection() === 'favorites' ? 'Favorites'
    : this.selection() === 'unfiled' ? 'Unfiled'
    : this.folders().find(folder => folder.id === this.selection())?.name ?? 'Folder');

  constructor() {
    this.readSelection();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.readSelection();
        this.validateSelection();
      });
  }

  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.api
      .getAll()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (folders) => {
          this.folders.set(folders);
          this.loaded.set(true);
          this.validateSelection();
        },
        error: () => this.error.set('Unable to load folders.'),
      });
  }

  saveFolder(folder: Folder): void {
    this.folders.update((folders) =>
      [...folders.filter((current) => current.id !== folder.id), folder].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
  }

  removeFolder(id: string): void {
    this.folders.update((folders) => folders.filter((folder) => folder.id !== id));
    this.folderDeleted.next(id);
    if (this.selection() === id) void this.router.navigate(['/dashboard']);
  }

  private readSelection(): void {
    const params = this.router.parseUrl(this.router.url).queryParams;
    this.selection.set(
      params['folder'] ||
        (['unfiled', 'favorites'].includes(params['collection']) ? params['collection'] : 'all'),
    );
  }

  private validateSelection(): void {
    const id = this.selection();
    if (
      this.loaded() &&
      !this.error() &&
      id !== 'all' &&
      id !== 'unfiled' &&
      id !== 'favorites' &&
      !this.folders().some((folder) => folder.id === id)
    ) {
      void this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  }
}
