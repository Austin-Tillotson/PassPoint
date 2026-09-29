import { Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

import { FloatingInput } from '../../../../shared/components/floating-input/floating-input';
import type { PasswordEntry } from '../../models/password-entry';
import { PasswordEntriesService } from '../../services/password-entries.service';

@Component({
  selector: 'app-add-password-dialog',
  imports: [FloatingInput, ReactiveFormsModule, FaIconComponent],
  templateUrl: './add-password-dialog.html',
  styleUrl: './add-password-dialog.scss',
})
export class AddPasswordDialog {
  private readonly passwordEntriesService = inject(PasswordEntriesService);

  private readonly dialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  public readonly passwordSaved = output<PasswordEntry>();

  protected readonly editingEntry = signal<PasswordEntry | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly faXmark = faXmark;

  protected readonly passwordForm = new FormGroup({
    siteName: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^https?:\/\/.+/i),
      ],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  public open(entry?: PasswordEntry): void {
    if (this.isSubmitting()) return;
    this.editingEntry.set(entry ?? null);
    this.errorMessage.set(null);

    this.passwordForm.reset({
      siteName: entry?.siteName ?? '',
      password: entry?.password ?? '',
    });

    this.dialog().nativeElement.showModal();
    this.dialog().nativeElement.querySelector<HTMLInputElement>('[formControlName="siteName"] input')?.focus();
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      const fieldName = this.passwordForm.controls.siteName.invalid ? 'siteName' : 'password';
      this.dialog().nativeElement.querySelector<HTMLInputElement>(`[formControlName="${fieldName}"] input`)?.focus();
      return;
    }

    const editingEntry = this.editingEntry();
    const passwordEntry = this.passwordForm.getRawValue();

    this.errorMessage.set(null);
    this.isSubmitting.set(true);
    this.passwordForm.disable();

    const request = editingEntry
      ? this.passwordEntriesService.update(editingEntry.id, passwordEntry)
      : this.passwordEntriesService.create(passwordEntry);

    request
      .pipe(finalize(() => {
        this.isSubmitting.set(false);
        this.passwordForm.enable();
      }))
      .subscribe({
        next: (entry) => {
          this.passwordSaved.emit(entry);
          this.dialog().nativeElement.close();
        },
        error: () => {
          this.errorMessage.set(
            editingEntry
              ? 'Unable to update the password. Please try again.'
              : 'Unable to add the password. Please try again.',
          );
        },
      });
  }

  protected onCancel(event: Event): void {
    if (this.isSubmitting()) event.preventDefault();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (!this.isSubmitting() && event.target === event.currentTarget) {
      this.dialog().nativeElement.close();
    }
  }
}
