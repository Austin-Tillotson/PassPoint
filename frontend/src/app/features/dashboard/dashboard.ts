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
import { faPlus, faKey } from '@fortawesome/free-solid-svg-icons';

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
  private readonly emptyAddButton = viewChild<ElementRef<HTMLButtonElement>>('emptyAddButton');
  private readonly headingAddButton =
    viewChild.required<ElementRef<HTMLButtonElement>>('headingAddButton');

  private readonly detailDialog = viewChild.required(PasswordDetailDialog);
  protected readonly isDeleting = signal(false);

  protected readonly faPlus = faPlus;
  protected readonly faKey = faKey;
  protected readonly passwordEntries = signal<PasswordEntry[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly hasLoaded = signal(false);
  protected readonly canAddPassword = computed(
    () => this.hasLoaded() && !this.isLoading() && !this.loadError(),
  );
  protected readonly showFloatingAdd = signal(false);
  protected readonly isEmpty = computed(() => this.hasLoaded() && !this.isLoading() && !this.loadError() && this.passwordEntries().length === 0);

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
    this.passwordEntriesService
      .getAll()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (entries) => {
          this.passwordEntries.set(entries);
          this.hasLoaded.set(true);
        },
        error: () => this.loadError.set('Unable to load your saved passwords.'),
      });
  }

  protected openDetails(entry: PasswordEntry): void {
    this.deleteError.set(null);
    this.detailDialog().open(entry);
  }

  protected savePasswordEntry(savedEntry: PasswordEntry): void {
    const wasEmpty = this.isEmpty();
    this.passwordEntries.update((entries) => {
      const exists = entries.some((entry) => entry.id === savedEntry.id);

      const updatedEntries = exists
        ? entries.map((entry) =>
            entry.id === savedEntry.id ? savedEntry : entry,
          )
        : [...entries, savedEntry];

      return updatedEntries.sort((first, second) =>
        first.siteName.localeCompare(second.siteName),
      );
    });
    if (wasEmpty) this.focusAddAction();
  }

  private focusAddAction(): void {
    afterNextRender(() => {
      (this.emptyAddButton() ?? this.headingAddButton()).nativeElement.focus();
    }, { injector: this.injector });
  }

  protected deletePasswordEntry(entry: PasswordEntry): void {
    const shouldDelete = window.confirm(
      `Delete the password entry for ${entry.siteName}?`,
    );

    if (!shouldDelete) {
      return;
    }

    this.deleteError.set(null);

    this.isDeleting.set(true);
    this.passwordEntriesService.delete(entry.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.detailDialog().close();
        this.focusAddAction();
        this.passwordEntries.update((entries) =>
          entries.filter((currentEntry) => currentEntry.id !== entry.id),
        );
      },
      error: () => {
        this.isDeleting.set(false);
        this.deleteError.set('Unable to delete the password entry.');
      },
    });
  }
}
