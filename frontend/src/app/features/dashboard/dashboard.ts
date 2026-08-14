import { Component, signal } from '@angular/core';

import { AddPasswordDialog } from './components/add-password-dialog/add-password-dialog';
import { PasswordCard } from './components/password-card/password-card';
import type { NewPasswordEntry, PasswordEntry } from './models/password-entry';

@Component({
  selector: 'app-dashboard',
  imports: [AddPasswordDialog, PasswordCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})

export class Dashboard {
  protected readonly passwordEntries = signal<PasswordEntry[]>([]);

  private nextEntryId = 1;

  protected addPasswordEntry(entry: NewPasswordEntry): void {
    this.passwordEntries.update((entries) => [
      ...entries,
      {
        ...entry,
        id: this.nextEntryId++,
      },
    ]);
  }
}