import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  kind: 'success' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly document = inject(DOCUMENT);
  private nextId = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  readonly toasts = signal<Toast[]>([]);
  readonly activeDialog = signal<Element | null>(null);
  lastContentFocus: HTMLElement | null = null;

  constructor() {
    const updateDialog = () => {
      const dialogs = this.document.querySelectorAll('dialog[open]');
      const dialog = dialogs.item(dialogs.length - 1);
      if (dialog !== this.activeDialog()) {
        // The old outlet is removed, so it cannot resume a hovered or focused toast.
        for (const toast of this.toasts()) {
          if (!this.timers.has(toast.id)) this.resume(toast.id);
        }
        this.activeDialog.set(dialog);
      }
    };
    const observer = new MutationObserver(updateDialog);
    observer.observe(this.document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
    updateDialog();
    const rememberFocus = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLElement && !target.closest('app-toast-outlet')) this.lastContentFocus = target;
    };
    this.document.addEventListener('focusin', rememberFocus);
    inject(DestroyRef).onDestroy(() => {
      observer.disconnect();
      this.document.removeEventListener('focusin', rememberFocus);
      this.clear();
    });
  }

  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void { this.show(message, 'error'); }

  private show(message: string, kind: Toast['kind']): void {
    const id = ++this.nextId;
    this.toasts.update(items => [...items, { id, message, kind }]);
    this.resume(id);
  }

  dismiss(id: number): void {
    this.pause(id);
    this.toasts.update(items => items.filter(item => item.id !== id));
  }

  pause(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
  }

  resume(id: number): void {
    this.pause(id);
    if (this.toasts().some(item => item.id === id)) {
      this.timers.set(id, setTimeout(() => this.dismiss(id), 5000));
    }
  }

  clear(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.toasts.set([]);
  }
}
