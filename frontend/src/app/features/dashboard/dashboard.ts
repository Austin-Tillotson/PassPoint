import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

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
  private readonly headingAddButton =
    viewChild.required<ElementRef<HTMLButtonElement>>('headingAddButton');

  private readonly detailDialog = viewChild.required(PasswordDetailDialog);
  protected readonly isDeleting = signal(false);

  protected readonly faPlus = faPlus;
  protected readonly passwordEntries = signal<PasswordEntry[]>([]);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showFloatingAdd = signal(false);

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
    this.passwordEntriesService.getAll().subscribe({
      next: (entries) => this.passwordEntries.set(entries),
      error: () =>
        this.errorMessage.set('Unable to load your saved passwords.'),
    });
  }

  protected openDetails(entry: PasswordEntry): void {
    this.errorMessage.set(null);
    this.detailDialog().open(entry);
  }

  protected savePasswordEntry(savedEntry: PasswordEntry): void {
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
  }

  protected deletePasswordEntry(entry: PasswordEntry): void {
    const shouldDelete = window.confirm(
      `Delete the password entry for ${entry.siteName}?`,
    );

    if (!shouldDelete) {
      return;
    }

    this.errorMessage.set(null);

    this.isDeleting.set(true);
    this.passwordEntriesService.delete(entry.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.detailDialog().close();
        this.headingAddButton().nativeElement.focus();
        this.passwordEntries.update((entries) =>
          entries.filter((currentEntry) => currentEntry.id !== entry.id),
        );
      },
      error: () => {
        this.isDeleting.set(false);
        this.errorMessage.set('Unable to delete the password entry.');
      },
    });
  }
}
