import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '../../../core/services/toast.service';
import { ToastOutlet } from './toast-outlet';

@Component({
  imports: [ToastOutlet],
  template: '<button class="origin">Action</button><app-toast-outlet /><dialog><button>Dialog action</button><app-toast-outlet /></dialog>',
})
class Host {}

describe('Toast presentation', () => {
  it('shows a single stack in the active modal and returns it to the page when closed', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const service = TestBed.inject(ToastService);
    service.success('Saved');
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const dialog = element.querySelector('dialog')!;
    expect(element.querySelectorAll('.toast')).toHaveLength(1);
    expect(dialog.querySelector('.toast')).toBeNull();
    dialog.setAttribute('open', '');
    await Promise.resolve();
    await fixture.whenStable();
    expect(dialog.querySelectorAll('.toast')).toHaveLength(1);
    expect(element.querySelectorAll('.toast')).toHaveLength(1);
    dialog.removeAttribute('open');
    await Promise.resolve();
    await fixture.whenStable();
    expect(dialog.querySelector('.toast')).toBeNull();
    expect(element.querySelectorAll('.toast')).toHaveLength(1);
  });

  it('dismisses without stealing focus and restores focus when using the close button', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const origin = element.querySelector<HTMLButtonElement>('.origin')!;
    origin.focus();
    const service = TestBed.inject(ToastService);
    service.success('Saved');
    await fixture.whenStable();
    expect(document.activeElement).toBe(origin);
    const close = element.querySelector<HTMLButtonElement>('.toast button')!;
    close.focus();
    close.click();
    await fixture.whenStable();
    expect(service.toasts()).toEqual([]);
    expect(document.activeElement).toBe(origin);
  });
});
