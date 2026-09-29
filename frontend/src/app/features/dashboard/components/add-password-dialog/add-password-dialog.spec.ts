import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { AddPasswordDialog } from './add-password-dialog';
import { PasswordEntriesService } from '../../services/password-entries.service';
import type { PasswordEntry } from '../../models/password-entry';

describe('Password form submission', () => {
  const entry: PasswordEntry = { id: '1', siteName: 'https://example.com', password: 'Sample-only', createdAtUtc: '2026-09-25T12:00:00Z' };

  async function setup(edit = true) {
    const response = new Subject<PasswordEntry>();
    const service = { create: vi.fn(() => response), update: vi.fn(() => response) };
    TestBed.configureTestingModule({ providers: [{ provide: PasswordEntriesService, useValue: service }] });
    const fixture = TestBed.createComponent(AddPasswordDialog);
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('dialog');
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn();
    fixture.componentInstance.open(edit ? entry : undefined);
    await fixture.whenStable();
    const submit = () => fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return { fixture, dialog, response, service, submit };
  }

  it('shows linked field errors and focuses the first invalid input', async () => {
    const { fixture, service, submit } = await setup(false);
    submit();
    await fixture.whenStable();
    const site = fixture.nativeElement.querySelector('[formControlName=siteName] input');
    expect(document.activeElement).toBe(site);
    expect(site.getAttribute('aria-describedby')).toContain('site-error');
    expect(fixture.nativeElement.querySelector('#password-error').textContent).toContain('required');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('blocks duplicate submissions and dismissal while pending, then retains values on failure', async () => {
    const { fixture, dialog, service, response, submit } = await setup();
    submit(); submit();
    await fixture.whenStable();
    expect(service.update).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[formControlName=siteName] input').disabled).toBe(true);
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    dialog.click();
    expect(dialog.close).not.toHaveBeenCalled();
    response.error(new Error('Unavailable'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[formControlName=siteName] input').value).toBe(entry.siteName);
    expect(fixture.nativeElement.querySelector('[formControlName=password] input').value).toBe(entry.password);
    expect(fixture.nativeElement.querySelector('[formControlName=siteName] input').disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.password-dialog__errors').textContent).toContain('Please try again');
    submit();
    expect(service.update).toHaveBeenCalledTimes(2);
  });

  it('emits the saved entry and closes after success', async () => {
    const { fixture, dialog, response, submit } = await setup();
    const saved = vi.fn();
    fixture.componentInstance.passwordSaved.subscribe(saved);
    submit();
    response.next(entry); response.complete();
    await fixture.whenStable();
    expect(saved).toHaveBeenCalledWith(entry);
    expect(dialog.close).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('form').getAttribute('aria-busy')).toBe('false');
  });
});
