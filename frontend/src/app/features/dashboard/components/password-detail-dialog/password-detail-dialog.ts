import { Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEye, faEyeSlash, faGlobe, faPen, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import type { PasswordEntry } from '../../models/password-entry';

@Component({
  selector: 'app-password-detail-dialog',
  imports: [FaIconComponent],
  templateUrl: './password-detail-dialog.html',
  styleUrl: './password-detail-dialog.scss',
})
export class PasswordDetailDialog {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly errorMessage = input<string | null>(null);
  readonly isDeleting = input(false);
  readonly editRequested = output<PasswordEntry>();
  readonly deleteRequested = output<PasswordEntry>();
  protected readonly entry = signal<PasswordEntry | null>(null);
  protected readonly isPasswordVisible = signal(false);

  protected readonly faEye = faEye;
  protected readonly faEyeSlash = faEyeSlash;
  protected readonly faGlobe = faGlobe;
  protected readonly faPen = faPen;
  protected readonly faTrash = faTrash;
  protected readonly faXmark = faXmark;
  protected readonly siteTitle = computed(() => {
    const site = this.entry()?.siteName ?? '';
    try { return new URL(site).hostname; } catch { return site; }
  });

  open(entry: PasswordEntry): void {
    this.entry.set(entry);
    this.isPasswordVisible.set(false);
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.isPasswordVisible.set(false);
    this.dialog().nativeElement.close();
  }

  protected edit(entry: PasswordEntry): void {
    // Restore focus to the row before the edit dialog captures its return target.
    this.close();
    this.editRequested.emit(entry);
  }

  protected togglePassword(): void {
    this.isPasswordVisible.update(visible => !visible);
  }

  protected resetVisibility(): void {
    this.isPasswordVisible.set(false);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }
}
