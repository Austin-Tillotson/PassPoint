import { RouterLink } from '@angular/router';
import { FolderStore } from '../../core/services/folder-store';
import {
  Component,
  computed,
  effect,
  DestroyRef,
  Injector,
  ElementRef,
  OnInit,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faMagnifyingGlass,
  faList,
  faTableCellsLarge,
  faPlus,
  faStar,
  faKey,
  faRotateRight,
  faTriangleExclamation,
  faCheck,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import { AddPasswordDialog } from './components/add-password-dialog/add-password-dialog';
import { PasswordDetailDialog } from './components/password-detail-dialog/password-detail-dialog';
import { PasswordRow } from './components/password-row/password-row';
import { QuickFavorites } from './components/quick-favorites/quick-favorites';
import type { PasswordEntry } from './models/password-entry';
import { PasswordEntriesService } from './services/password-entries.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, AddPasswordDialog, FaIconComponent, PasswordRow, PasswordDetailDialog, QuickFavorites],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly deletedFolderIds = new Set<string>();
  protected readonly folderStore = inject(FolderStore);
  protected readonly quickFavorites = computed(() => this.passwordEntries()
    .filter(entry => entry.isFavorite)
    .sort((a, b) => a.siteName.replace(/^https?:\/\/(?:www\.)?/i, '').localeCompare(
      b.siteName.replace(/^https?:\/\/(?:www\.)?/i, ''), undefined, { sensitivity: 'base', numeric: true }))
    .slice(0, 4));
  protected readonly collectionEntries = computed(() => {
    const selection = this.folderStore.selection();
    return this.passwordEntries().filter(
      (entry) =>
        selection === 'all' ||
        (selection === 'favorites'
          ? !!entry.isFavorite
          : selection === 'unfiled'
            ? !entry.folderId
            : entry.folderId === selection),
    );
  });
  private readonly passwordEntriesService = inject(PasswordEntriesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  private readonly emptyFavoritesLink =
    viewChild<ElementRef<HTMLAnchorElement>>('emptyFavoritesLink');
  private readonly emptyAddButton = viewChild<ElementRef<HTMLButtonElement>>('emptyAddButton');
  private readonly headingAddButton =
    viewChild.required<ElementRef<HTMLButtonElement>>('headingAddButton');

  private readonly detailDialog = viewChild.required(PasswordDetailDialog);
  private readonly addDialog = viewChild.required(AddPasswordDialog);
  private editReturnTarget: HTMLElement | null = null;
  protected readonly isDeleting = signal(false);

  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly faList = faList;
  protected readonly faTableCellsLarge = faTableCellsLarge;
  protected readonly viewMode = signal<'list' | 'grid'>('list');
  protected readonly searchQuery = signal('');
  protected readonly normalizedQuery = computed(() => this.searchQuery().trim().toLowerCase());
  protected readonly filteredEntries = computed(() => {
    const query = this.normalizedQuery();
    const matches = query
      ? this.collectionEntries().filter((entry) => entry.siteName.toLowerCase().includes(query))
      : this.collectionEntries();
    const siteLabel = (entry: PasswordEntry) =>
      entry.siteName.replace(/^https?:\/\/(?:www\.)?/i, '');
    return [...matches].sort((first, second) =>
      siteLabel(first).localeCompare(siteLabel(second), undefined, {
        sensitivity: 'base',
        numeric: true,
      }),
    );
  });
  protected readonly showSearch = computed(
    () => this.canAddPassword() && this.collectionEntries().length > 0,
  );

  protected readonly hasNoMatches = computed(
    () => this.showSearch() && this.filteredEntries().length === 0,
  );
  protected readonly searchSummary = computed(() => {
    if (!this.showSearch())
      return this.canAddPassword() && this.folderStore.selection() === 'favorites'
        ? '0 favorites'
        : '';
    const total = this.collectionEntries().length;
    const noun = total === 1 ? 'password' : 'passwords';
    return this.normalizedQuery()
      ? `${this.filteredEntries().length} of ${total} ${noun}`
      : `${total} ${noun}`;
  });

  protected readonly faPlus = faPlus;
  protected readonly faStar = faStar;
  protected readonly faKey = faKey;
  protected readonly faRotateRight = faRotateRight;
  protected readonly faTriangleExclamation = faTriangleExclamation;
  protected readonly passwordEntries = signal<PasswordEntry[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly selectedEntryId = signal<string | null>(null);
  protected readonly detailFolderColor = computed(() => {
    const id = this.passwordEntries().find(entry => entry.id === this.selectedEntryId())?.folderId;
    return (id && this.folderStore.folderColors()[id]) || 'var(--color-text-muted)';
  });
  protected readonly favoritePending = signal<Record<string, boolean>>({});
  protected readonly favoriteErrors = signal<Record<string, string>>({});
  protected readonly selectedEntryIsFavorite = computed(
    () => !!this.passwordEntries().find((entry) => entry.id === this.selectedEntryId())?.isFavorite,
  );
  protected readonly detailFolderName = computed(() => {
    const id = this.passwordEntries().find(
      (entry) => entry.id === this.selectedEntryId(),
    )?.folderId;
    return id
      ? (this.folderStore.folders().find((folder) => folder.id === id)?.name ??
          'Folder unavailable')
      : 'Unfiled';
  });
  private readonly deleteErrors = signal<Record<string, string>>({});
  protected readonly deleteError = computed(
    () => this.deleteErrors()[this.selectedEntryId() ?? ''] ?? null,
  );
  protected readonly feedback = signal('');
  protected readonly feedbackVersion = signal(0);
  protected readonly deletingEntryId = signal<string | null>(null);
  protected readonly faCheck = faCheck;
  protected readonly faXmark = faXmark;
  protected readonly isLoading = signal(false);
  protected readonly hasLoaded = signal(false);
  protected readonly canAddPassword = computed(
    () => this.hasLoaded() && !this.isLoading() && !this.loadError(),
  );
  protected readonly showFloatingAdd = signal(false);
  protected readonly isEmpty = computed(
    () =>
      this.hasLoaded() &&
      !this.isLoading() &&
      !this.loadError() &&
      this.collectionEntries().length === 0,
  );

  constructor() {
    effect(() => {
      if (!this.hasLoaded() || this.isLoading() || this.loadError()) {
        this.folderStore.passwordCounts.set(null);
        return;
      }

      const counts: Record<string, number> = {};
      for (const entry of this.passwordEntries()) {
        const folderId = entry.folderId ?? 'unfiled';
        counts[folderId] = (counts[folderId] ?? 0) + 1;
      }
      this.folderStore.passwordCounts.set(counts);
    });
    effect(() => {
      this.folderStore.selection();
      this.searchQuery.set('');
    });
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') {
        return;
      }

      const observer = new IntersectionObserver(([entry]) => {
        this.showFloatingAdd.set(!entry.isIntersecting);
      });

      observer.observe(this.headingAddButton().nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  ngOnInit(): void {
    this.folderStore.folderDeleted.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((id) => {
      this.deletedFolderIds.add(id);
      this.passwordEntries.update((entries) =>
        entries.map((entry) => (entry.folderId === id ? { ...entry, folderId: null } : entry)),
      );
    });
    this.loadEntries();
  }

  protected loadEntries(): void {
    if (this.isLoading()) return;
    const retry = this.host.nativeElement.querySelector('.dashboard-retry');
    const restoreFocus = !!retry && document.activeElement === retry;
    this.isLoading.set(true);
    this.loadError.set(null);
    if (restoreFocus) {
      afterNextRender(
        () => {
          if (document.activeElement === document.body) {
            this.host.nativeElement.querySelector<HTMLElement>('.loading-status')?.focus();
          }
        },
        { injector: this.injector },
      );
    }
    this.passwordEntriesService
      .getAll()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoading.set(false);
          if (restoreFocus && !this.destroyRef.destroyed) {
            afterNextRender(
              () => {
                const active = document.activeElement;
                const status = this.host.nativeElement.querySelector('.loading-status');
                if (active !== document.body && active !== status) return;
                this.host.nativeElement
                  .querySelector<HTMLElement>(
                    '.dashboard-retry, .dashboard-state button, .password-row__site',
                  )
                  ?.focus();
              },
              { injector: this.injector },
            );
          }
        }),
      )
      .subscribe({
        next: (entries) => {
          this.passwordEntries.set(
            entries.map((entry) =>
              entry.folderId && this.deletedFolderIds.has(entry.folderId)
                ? { ...entry, folderId: null }
                : entry,
            ),
          );
          this.hasLoaded.set(true);
        },
        error: () => this.loadError.set('Unable to load your saved passwords.'),
      });
  }

  protected toggleFavorite(entry: PasswordEntry): void {
    if (this.favoritePending()[entry.id] || this.isDeleting()) return;
    const current = this.passwordEntries().find((item) => item.id === entry.id);
    if (!current) return;
    const returnTarget =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let removedFromView = false;
    let nextFocusId: string | undefined;
    this.favoritePending.update((pending) => ({ ...pending, [entry.id]: true }));
    this.favoriteErrors.update((errors) => ({ ...errors, [entry.id]: '' }));
    this.passwordEntriesService
      .setFavorite(entry.id, !current.isFavorite)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.favoritePending.update((pending) => {
            const updated = { ...pending };
            delete updated[entry.id];
            return updated;
          });
          if (!this.destroyRef.destroyed) {
            afterNextRender(
              () => {
                if (document.activeElement !== document.body) return;
                if (removedFromView) {
                  const next = nextFocusId
                    ? this.findRow(nextFocusId)?.querySelector<HTMLElement>('.password-row__site')
                    : null;
                  (
                    next ??
                    this.emptyFavoritesLink()?.nativeElement ??
                    this.searchFocusTarget() ??
                    this.headingAddButton().nativeElement
                  ).focus();
                } else if (returnTarget?.isConnected) {
                  returnTarget.focus();
                }
              },
              { injector: this.injector },
            );
          }
        }),
      )
      .subscribe({
        next: (saved) => {
          const visible = this.filteredEntries();
          const index = visible.findIndex((item) => item.id === entry.id);
          nextFocusId = visible[index + 1]?.id ?? visible[index - 1]?.id;
          // Patch only the flag so concurrent folder or password changes survive.
          this.passwordEntries.update((entries) =>
            entries.map((item) =>
              item.id === entry.id ? { ...item, isFavorite: saved.isFavorite } : item,
            ),
          );
          removedFromView =
            index >= 0 && !this.filteredEntries().some((item) => item.id === entry.id);
          if (removedFromView && this.detailDialog().isShowing(entry.id))
            this.detailDialog().close();
          this.announceSuccess(saved.isFavorite ? 'Added to favorites' : 'Removed from favorites');
        },
        error: () =>
          this.favoriteErrors.update((errors) => ({
            ...errors,
            [entry.id]: 'Unable to update favorite. Please try again.',
          })),
      });
  }

  protected updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
    this.searchInput()?.nativeElement.focus();
  }

  protected openDetails(entry: PasswordEntry): void {
    this.selectedEntryId.set(entry.id);
    this.detailDialog().open(entry);
  }

  protected editPasswordEntry(entry: PasswordEntry): void {
    const active = document.activeElement;
    this.editReturnTarget =
      active instanceof HTMLElement && this.findRow(entry.id)?.contains(active) ? active : null;
    this.addDialog().open(entry);
  }

  protected savePasswordEntry(savedEntry: PasswordEntry): void {
    const wasEmpty = this.isEmpty();
    const isEdit = this.passwordEntries().some((entry) => entry.id === savedEntry.id);
    this.passwordEntries.update((entries) => {
      const exists = entries.some((entry) => entry.id === savedEntry.id);

      const updatedEntries = exists
        ? entries.map((entry) => (entry.id === savedEntry.id ? savedEntry : entry))
        : [...entries, savedEntry];

      return updatedEntries.sort((first, second) => first.siteName.localeCompare(second.siteName));
    });
    const matchesSearch = savedEntry.siteName.toLowerCase().includes(this.normalizedQuery());
    const inCollection = this.collectionEntries().some((entry) => entry.id === savedEntry.id);
    const isVisible = matchesSearch && inCollection;
    const message = isEdit ? 'Password updated' : 'Password added';
    this.announceSuccess(
      !inCollection
        ? message + '. This entry is in a different collection.'
        : matchesSearch
          ? message
          : message + '. This entry does not match your search.',
    );
    if (wasEmpty) this.focusAddAction();
    else if (isEdit && !isVisible && this.editReturnTarget) {
      const returnTarget = this.editReturnTarget;
      afterNextRender(
        () => {
          if (!returnTarget.isConnected && document.activeElement === document.body) {
            (
              this.emptyAddButton()?.nativeElement ??
              this.searchInput()?.nativeElement ??
              this.headingAddButton().nativeElement
            ).focus();
          }
        },
        { injector: this.injector },
      );
    }
    this.editReturnTarget = null;
  }

  private focusAddAction(): void {
    afterNextRender(
      () => {
        (this.emptyAddButton() ?? this.headingAddButton()).nativeElement.focus();
      },
      { injector: this.injector },
    );
  }

  protected deletePasswordEntry(entry: PasswordEntry): void {
    if (this.isDeleting()) return;
    if (!window.confirm(`Delete the password entry for ${entry.siteName}?`)) return;
    this.deleteErrors.update((errors) => {
      const updated = { ...errors };
      delete updated[entry.id];
      return updated;
    });
    this.deletingEntryId.set(entry.id);
    this.isDeleting.set(true);
    this.passwordEntriesService
      .delete(entry.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDeleting.set(false);
          const entries = this.passwordEntries();
          const visible = this.filteredEntries();
          const index = visible.findIndex((current) => current.id === entry.id);
          const nextId = index < 0 ? undefined : (visible[index + 1]?.id ?? visible[index - 1]?.id);
          const deletedRow = this.findRow(entry.id);
          const shouldClose = this.detailDialog().isShowing(entry.id);
          const shouldFocus = shouldClose || !!deletedRow?.contains(document.activeElement);
          if (shouldClose) this.detailDialog().close();
          this.passwordEntries.set(entries.filter((current) => current.id !== entry.id));
          if (this.collectionEntries().length === 0) this.searchQuery.set('');
          this.announceSuccess('Password deleted');
          if (shouldFocus) {
            afterNextRender(
              () => {
                // Do not interrupt a control selected while the request was pending.
                if (document.activeElement !== document.body && document.activeElement?.isConnected)
                  return;
                const target = nextId
                  ? this.findRow(nextId)?.querySelector<HTMLElement>('.password-row__site')
                  : (this.emptyAddButton()?.nativeElement ??
                    this.emptyFavoritesLink()?.nativeElement ??
                    this.searchFocusTarget());
                target?.focus();
              },
              { injector: this.injector },
            );
          }
        },
        error: () => {
          this.isDeleting.set(false);
          this.deleteErrors.update((errors) => ({
            ...errors,
            [entry.id]: 'Unable to delete the password entry. Please try again.',
          }));
        },
      });
  }

  protected dismissFeedback(event: Event): void {
    if (document.activeElement === event.currentTarget) {
      const target =
        this.emptyAddButton()?.nativeElement ??
        this.host.nativeElement.querySelector<HTMLButtonElement>('.password-row__site') ??
        this.searchFocusTarget() ??
        this.headingAddButton().nativeElement;
      target.focus();
    }
    this.feedback.set('');
  }

  private searchFocusTarget(): HTMLElement | undefined {
    return (
      this.host.nativeElement.querySelector<HTMLButtonElement>('.dashboard-search-reset') ??
      this.searchInput()?.nativeElement
    );
  }

  private announceSuccess(message: string): void {
    this.feedback.set(message);
    this.feedbackVersion.update((version) => version + 1);
  }

  private findRow(id: string): HTMLElement | undefined {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>('[data-entry-id]'),
    ).find((row) => row.dataset['entryId'] === id);
  }
}
