import { Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import type { PasswordEntry } from '../../models/password-entry';
import { PasswordEntriesService } from '../../services/password-entries.service';

@Component({
  selector: 'app-add-password-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './add-password-dialog.html',
  styleUrl: './add-password-dialog.scss',
})
export class AddPasswordDialog {
  private readonly passwordEntriesService = inject(PasswordEntriesService);

  private readonly dialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  public readonly passwordAdded = output<PasswordEntry>();

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);

  protected readonly passwordForm = new FormGroup({
    siteName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  public open(): void {
    this.passwordForm.reset();
    this.errorMessage.set(null);
    this.dialog().nativeElement.showModal();
  }

  protected onSubmit(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    this.passwordEntriesService
      .create(this.passwordForm.getRawValue())
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (entry) => {
          this.passwordAdded.emit(entry);
          this.dialog().nativeElement.close();
        },
        error: () => {
          this.errorMessage.set('Unable to add the password. Please try again.');
        },
      });
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.dialog().nativeElement.close();
    }
  }
}