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

  protected addPasswordEntry(entry: PasswordEntry): void {
    this.passwordEntries.update((entries) =>
      [...entries, entry].sort((first, second) =>
        first.siteName.localeCompare(second.siteName),
      ),
    );
  }
}