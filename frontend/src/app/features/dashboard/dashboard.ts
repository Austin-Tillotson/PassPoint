import {
  Component,
  computed,
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
  faPlus,
  faKey,
  faRotateRight,
  faTriangleExclamation,
  faCheck,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import { AddPasswordDialog } from './components/add-password-dialog/add-password-dialog';
import { PasswordDetailDialog } from './components/password-detail-dialog/password-detail-dialog';
import { PasswordRow } from './components/password-row/password-row';
import type { PasswordEntry } from './models/password-entry';
import { PasswordEntriesService } from './services/password-entries.service';

@Component({
  selector: 'app-dashboard',
  imports: [AddPasswordDialog, FaIconComponent, PasswordRow, PasswordDetailDialog],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly passwordEntriesService = inject(PasswordEntriesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  private readonly emptyAddButton = viewChild<ElementRef<HTMLButtonElement>>('emptyAddButton');
  private readonly headingAddButton =
    viewChild.required<ElementRef<HTMLButtonElement>>('headingAddButton');

  private readonly detailDialog = viewChild.required(PasswordDetailDialog);
  protected readonly isDeleting = signal(false);

  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly searchQuery = signal('');
  protected readonly showSearch = computed(
    () => this.canAddPassword() && this.passwordEntries().length > 0,
  );

  protected readonly faPlus = faPlus;
  protected readonly faKey = faKey;
  protected readonly faRotateRight = faRotateRight;
  protected readonly faTriangleExclamation = faTriangleExclamation;
  protected readonly passwordEntries = signal<PasswordEntry[]>([]);
  protected readonly loadError = signal<string | null>(null);
  private readonly selectedEntryId = signal<string | null>(null);
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
      this.passwordEntries().length === 0,
  );

  constructor() {
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
          this.passwordEntries.set(entries);
          this.hasLoaded.set(true);
        },
        error: () => this.loadError.set('Unable to load your saved passwords.'),
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
    this.announceSuccess(isEdit ? 'Password updated' : 'Password added');
    if (wasEmpty) this.focusAddAction();
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
          const index = entries.findIndex((current) => current.id === entry.id);
          const nextId = entries[index + 1]?.id ?? entries[index - 1]?.id;
          const deletedRow = this.findRow(entry.id);
          const shouldClose = this.detailDialog().isShowing(entry.id);
          const shouldFocus = shouldClose || !!deletedRow?.contains(document.activeElement);
          if (shouldClose) this.detailDialog().close();
          this.passwordEntries.set(entries.filter((current) => current.id !== entry.id));
          this.announceSuccess('Password deleted');
          if (shouldFocus) {
            afterNextRender(
              () => {
                // Do not interrupt a control selected while the request was pending.
                if (document.activeElement !== document.body && document.activeElement?.isConnected)
                  return;
                const target = nextId
                  ? this.findRow(nextId)?.querySelector<HTMLElement>('.password-row__site')
                  : this.emptyAddButton()?.nativeElement;
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
        this.headingAddButton().nativeElement;
      target.focus();
    }
    this.feedback.set('');
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
