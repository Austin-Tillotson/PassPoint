import { Component, OnInit, inject, signal } from '@angular/core';

import { AddPasswordDialog } from './components/add-password-dialog/add-password-dialog';
import { PasswordCard } from './components/password-card/password-card';
import type { PasswordEntry } from './models/password-entry';
import { PasswordEntriesService } from './services/password-entries.service';

@Component({
  selector: 'app-dashboard',
  imports: [AddPasswordDialog, PasswordCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly passwordEntriesService = inject(PasswordEntriesService);

  protected readonly passwordEntries = signal<PasswordEntry[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.passwordEntriesService.getAll().subscribe({
      next: (entries) => this.passwordEntries.set(entries),
      error: () =>
        this.errorMessage.set('Unable to load your saved passwords.'),
    });
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

    this.passwordEntriesService.delete(entry.id).subscribe({
      next: () => {
        this.passwordEntries.update((entries) =>
          entries.filter((currentEntry) => currentEntry.id !== entry.id),
        );
      },
      error: () =>
        this.errorMessage.set('Unable to delete the password entry.'),
    });
  }
}