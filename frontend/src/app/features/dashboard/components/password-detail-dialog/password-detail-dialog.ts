import { SiteIcon } from '../../../../shared/components/site-icon/site-icon';
import { siteDisplayName } from '../../../../shared/utils/site-address';
import { ToastOutlet } from '../../../../shared/components/toast-outlet/toast-outlet';
import { ToastService } from '../../../../core/services/toast.service';
import { Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faStar,
  faCopy,
  faEye,
  faEyeSlash,
  faFolder,
  faPen,
  faTrash,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import type { PasswordEntry } from '../../models/password-entry';

@Component({
  selector: 'app-password-detail-dialog',
  imports: [SiteIcon, ToastOutlet, FaIconComponent],
  templateUrl: './password-detail-dialog.html',
  styleUrl: './password-detail-dialog.scss',
})
export class PasswordDetailDialog {
  private readonly toasts = inject(ToastService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly isFavorite = input(false);
  readonly favoritePending = input(false);
  readonly favoriteRequested = output<PasswordEntry>();
  protected readonly faStar = faStar;
  readonly folderName = input('Unfiled');
  readonly folderColor = input('var(--color-text-muted)');
  readonly isDeleting = input(false);
  readonly deletingEntryId = input<string | null>(null);
  readonly editRequested = output<PasswordEntry>();
  readonly deleteRequested = output<PasswordEntry>();
  protected readonly entry = signal<PasswordEntry | null>(null);
  protected readonly isPasswordVisible = signal(false);
  protected readonly copying = signal(false);
  protected readonly faCopy = faCopy;
  private copyVersion = 0;

  protected async copyPassword(): Promise<void> {
    const entry = this.entry();
    if (!entry || this.copying()) return;
    const version = ++this.copyVersion;
    this.copying.set(true);
    try {
      await navigator.clipboard.writeText(entry.password);
      if (version === this.copyVersion) this.toasts.success('Password copied.');
    } catch {
      if (version === this.copyVersion) this.toasts.error('Unable to copy password. Please try again.');
    } finally {
      if (version === this.copyVersion) this.copying.set(false);
    }
  }

  protected readonly faEye = faEye;
  protected readonly faEyeSlash = faEyeSlash;
  protected readonly faFolder = faFolder;
  protected readonly faPen = faPen;
  protected readonly faTrash = faTrash;
  protected readonly faXmark = faXmark;
  protected readonly siteTitle = computed(() => siteDisplayName(this.entry()?.siteName ?? ''));

  open(entry: PasswordEntry): void {
    this.resetCopy();
    this.entry.set(entry);
    this.isPasswordVisible.set(false);
    this.dialog().nativeElement.showModal();
  }

  isShowing(id: string): boolean {
    return this.dialog().nativeElement.open && this.entry()?.id === id;
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
    this.isPasswordVisible.update((visible) => !visible);
  }

  protected resetVisibility(): void {
    this.isPasswordVisible.set(false);
    this.resetCopy();
  }

  private resetCopy(): void {
    this.copyVersion++;
    this.copying.set(false);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }
}
