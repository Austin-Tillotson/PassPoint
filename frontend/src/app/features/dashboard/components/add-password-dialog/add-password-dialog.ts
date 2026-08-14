import { Component, ElementRef, output, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import type { NewPasswordEntry } from '../../models/password-entry';

@Component({
  selector: 'app-add-password-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './add-password-dialog.html',
  styleUrl: './add-password-dialog.scss',
})

export class AddPasswordDialog {
  private readonly dialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  public readonly passwordAdded = output<NewPasswordEntry>();

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
    this.dialog().nativeElement.showModal();
  }

  protected onSubmit(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.passwordAdded.emit({
      siteName: this.passwordForm.controls.siteName.value,
      password: this.passwordForm.controls.password.value,
    });

    this.dialog().nativeElement.close();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.dialog().nativeElement.close();
    }
}
}