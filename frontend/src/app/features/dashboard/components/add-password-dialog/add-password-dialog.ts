import { ToastOutlet } from '../../../../shared/components/toast-outlet/toast-outlet';
import { ToastService } from '../../../../core/services/toast.service';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FolderStore } from '../../../../core/services/folder-store';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown, faFolder, faFolderOpen, faXmark } from '@fortawesome/free-solid-svg-icons';

import { FloatingInput } from '../../../../shared/components/floating-input/floating-input';
import type { PasswordEntry } from '../../models/password-entry';
import { PasswordEntriesService } from '../../services/password-entries.service';

@Component({
  selector: 'app-add-password-dialog',
  imports: [ToastOutlet, FloatingInput, ReactiveFormsModule, FaIconComponent],
  templateUrl: './add-password-dialog.html',
  styleUrl: './add-password-dialog.scss',
})
export class AddPasswordDialog {
  private readonly toasts = inject(ToastService);
  protected readonly folderStore = inject(FolderStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly passwordEntriesService = inject(PasswordEntriesService);
  private readonly injector = inject(Injector);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  public readonly passwordSaved = output<PasswordEntry>();

  protected readonly editingEntry = signal<PasswordEntry | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly faXmark = faXmark;
  protected readonly faFolder = faFolder;
  protected readonly faFolderOpen = faFolderOpen;
  protected readonly faChevronDown = faChevronDown;
  protected readonly folderPickerOpen = signal(false);

  protected selectedFolderName(): string {
    const id = this.passwordForm.controls.folderId.value;
    return id ? this.folderStore.folders().find(folder => folder.id === id)?.name ?? 'Selected folder (unavailable)' : 'Unfiled';
  }

  protected closeFolderPicker(event?: Event): void {
    if (!this.folderPickerOpen()) return;
    event?.preventDefault();
    event?.stopPropagation();
    this.folderPickerOpen.set(false);
    this.dialog().nativeElement.querySelector<HTMLButtonElement>('.folder-picker__toggle')?.focus();
  }

  protected onFormClick(event: MouseEvent): void {
    if (event.target instanceof Element && !event.target.closest('.folder-picker')) {
      this.folderPickerOpen.set(false);
    }
  }

  protected readonly passwordForm = new FormGroup({
    folderId: new FormControl<string | null>(null),
    siteName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^https?:\/\/.+/i)],
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
    this.folderPickerOpen.set(false);

    this.passwordForm.reset({
      folderId: entry
        ? (entry.folderId ?? null)
        : ['all', 'unfiled', 'favorites'].includes(this.folderStore.selection())
          ? null
          : this.folderStore.selection(),
      siteName: entry?.siteName ?? '',
      password: entry?.password ?? '',
    });

    this.dialog().nativeElement.showModal();
    this.dialog()
      .nativeElement.querySelector<HTMLInputElement>('[formControlName="siteName"] input')
      ?.focus();
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      const fieldName = this.passwordForm.controls.siteName.invalid ? 'siteName' : 'password';
      this.dialog()
        .nativeElement.querySelector<HTMLInputElement>(`[formControlName="${fieldName}"] input`)
        ?.focus();
      return;
    }

    if (this.folderStore.loaded() && !this.folderStore.error() && this.selectedFolderMissing()) {
      this.errorMessage.set(
        'The selected folder is no longer available. Choose another folder or Unfiled.',
      );
      this.dialog().nativeElement.querySelector<HTMLButtonElement>('.folder-picker__toggle')?.focus();
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
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isSubmitting.set(false);
          this.passwordForm.enable();
        }),
      )
      .subscribe({
        next: (entry) => {
          this.passwordSaved.emit(entry);
          this.dialog().nativeElement.close();
        },
        error: (error: HttpErrorResponse) => {
          if (
            error.status === 409 ||
            (error.status === 400 &&
              error.error?.message === 'Choose one of your folders or Unfiled.')
          ) {
            this.toasts.error(
              'The selected folder may no longer be available. Check your folder selection and try again.',
            );
            this.folderStore.load();
            return;
          }
          this.toasts.error(
            editingEntry
              ? 'Unable to update the password. Please try again.'
              : 'Unable to add the password. Please try again.',
          );
        },
      });
  }

  protected selectedFolderMissing(): boolean {
    const id = this.passwordForm.controls.folderId.value;
    return !!id && !this.folderStore.folders().some((folder) => folder.id === id);
  }

  protected keepFocusedControlVisible(event: FocusEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    afterNextRender(
      () => {
        const dialog = this.dialog().nativeElement;
        if (!dialog.open || document.activeElement !== target || !dialog.contains(target)) return;
        const bounds = dialog.getBoundingClientRect();
        const control = target.getBoundingClientRect();
        // Blur validation can grow the form after the browser's focus scroll.
        if (
          bounds.height > 0 &&
          (control.top < bounds.top + 6 || control.bottom > bounds.bottom - 6)
        ) {
          target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
        }
      },
      { injector: this.injector },
    );
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
