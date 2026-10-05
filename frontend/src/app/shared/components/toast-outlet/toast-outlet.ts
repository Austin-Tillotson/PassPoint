import { Component, ElementRef, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-outlet',
  imports: [FaIconComponent],
  templateUrl: './toast-outlet.html',
  styleUrl: './toast-outlet.scss',
})
export class ToastOutlet {
  protected readonly service = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly faCheck = faCheck;
  protected readonly faTriangleExclamation = faTriangleExclamation;
  protected readonly faXmark = faXmark;

  protected active(): boolean {
    return this.service.activeDialog() === this.host.nativeElement.closest('dialog');
  }

  protected resume(id: number, element: HTMLElement): void {
    if (!element.matches(':hover') && !element.contains(document.activeElement)) this.service.resume(id);
  }

  protected onBlur(id: number, element: HTMLElement, event: FocusEvent): void {
    if (!element.matches(':hover') && !(event.relatedTarget instanceof Node && element.contains(event.relatedTarget))) {
      this.service.resume(id);
    }
  }

  protected dismiss(id: number, button: HTMLButtonElement): void {
    if (document.activeElement === button) {
      const next = Array.from(this.host.nativeElement.querySelectorAll<HTMLButtonElement>('button'))
        .find(item => item !== button);
      const previous = this.service.lastContentFocus;
      const dialog = this.service.activeDialog();
      const fallback = (dialog ?? document).querySelector<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled)');
      (next ?? (previous?.isConnected && (!dialog || dialog.contains(previous)) ? previous : fallback))?.focus();
    }
    this.service.dismiss(id);
  }
}
