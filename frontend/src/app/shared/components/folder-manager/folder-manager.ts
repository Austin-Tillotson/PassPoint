import { ToastOutlet } from '../toast-outlet/toast-outlet';
import { ToastService } from '../../../core/services/toast.service';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFolder, faPen, faPlus, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FolderStore } from '../../../core/services/folder-store';
import { Folder, FoldersService } from '../../../core/services/folders.service';

@Component({
  selector: 'app-folder-manager',
  imports: [ToastOutlet, ReactiveFormsModule, FaIconComponent],
  templateUrl: './folder-manager.html',
  styleUrl: './folder-manager.scss',
})
export class FolderManager {
  private readonly toasts = inject(ToastService);
  protected readonly store = inject(FolderStore);
  private readonly injector = inject(Injector);
  private readonly api = inject(FoldersService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private returnTarget: HTMLElement | null = null;
  protected readonly mode = signal<'list' | 'create' | 'rename' | 'delete'>('list');
  protected readonly selected = signal<Folder | null>(null);
  protected readonly pending = signal(false);
  protected readonly error = signal('');
  protected readonly name = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(50)],
  });
  protected readonly faFolder = faFolder;
  protected readonly faPen = faPen;
  protected readonly faPlus = faPlus;
  protected readonly faTrash = faTrash;
  protected readonly faXmark = faXmark;

  constructor() {
    effect(() => {
      if (!this.store.managerOpen()) return;
      this.returnTarget =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      this.mode.set('list');
      this.error.set('');
      this.focusControl();
      this.dialog().nativeElement.showModal();
    });
  }

  protected start(mode: 'create' | 'rename' | 'delete', folder?: Folder): void {
    if (this.pending()) return;
    this.mode.set(mode);
    this.selected.set(folder ?? null);
    this.name.reset(folder?.name ?? '');
    this.error.set('');
    this.focusControl();
  }

  protected back(): void {
    if (this.pending()) return;
    this.mode.set('list');
    this.focusControl();
    this.error.set('');
  }

  protected submit(): void {
    if (this.pending() || this.mode() === 'list') return;
    const name = this.name.value.trim();
    if (this.mode() !== 'delete' && (this.name.invalid || !name)) {
      this.name.markAsTouched();
      this.error.set('Enter a folder name between 1 and 50 characters.');
      return;
    }
    const selected = this.selected();
    const deleting = this.mode() === 'delete';
    const request: Observable<Folder | void> = deleting
      ? this.api.delete(selected!.id)
      : selected
        ? this.api.update(selected.id, name)
        : this.api.create(name);
    this.pending.set(true);
    this.error.set('');
    this.name.disable();
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.pending.set(false);
          this.name.enable();
        }),
      )
      .subscribe({
        next: (folder) => {
          if (deleting) this.store.removeFolder(selected!.id);
          else this.store.saveFolder(folder as Folder);
          this.toasts.success(
            deleting
              ? 'Folder deleted. Its passwords are now Unfiled.'
              : selected
                ? 'Folder renamed.'
                : 'Folder created.',
          );
          this.mode.set('list');
          this.focusControl();
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 409 && !deleting) {
            this.error.set('You already have a folder with that name.');
            return;
          }
          this.toasts.error(
            error.status === 409
              ? deleting
                ? 'The folder changed. Please try deleting it again.'
                : 'You already have a folder with that name.'
              : error.status === 404
                ? 'This folder no longer exists. Close this dialog and retry loading folders.'
                : 'Unable to save this change. Please try again.',
          );
          if (error.status === 404) this.store.load();
        },
      });
  }

  protected close(): void {
    if (!this.pending()) this.dialog().nativeElement.close();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected cancel(event: Event): void {
    if (this.pending()) event.preventDefault();
  }

  private focusControl(): void {
    afterNextRender(
      () => {
        const dialog = this.dialog().nativeElement;
        if (dialog.open)
          dialog
            .querySelector<HTMLElement>('input, form button, .folder-manager > button')
            ?.focus();
      },
      { injector: this.injector },
    );
  }

  protected onClosed(): void {
    this.store.managerOpen.set(false);
    if (this.returnTarget?.isConnected) {
      this.returnTarget.focus();
      // Deleting the active folder closes mobile navigation during the redirect.
      if (document.activeElement !== this.returnTarget) {
        document.querySelector<HTMLElement>('app-header .toggle-button')?.focus();
      }
    }
  }
}
