import { ToastService } from '../../../../core/services/toast.service';
import { provideRouter } from '@angular/router';
import { FolderStore } from '../../../../core/services/folder-store';
import { FoldersService } from '../../../../core/services/folders.service';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { AddPasswordDialog } from './add-password-dialog';
import { PasswordEntriesService } from '../../services/password-entries.service';
import type { PasswordEntry } from '../../models/password-entry';

describe('Password form submission', () => {
  const entry: PasswordEntry = {
    id: '1',
    siteName: 'https://example.com',
    password: 'Sample-only',
    createdAtUtc: '2026-09-25T12:00:00Z',
  };

  async function setup(edit = true) {
    const response = new Subject<PasswordEntry>();
    const service = { create: vi.fn(() => response), update: vi.fn(() => response) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        FolderStore,
        { provide: FoldersService, useValue: {} },
        { provide: PasswordEntriesService, useValue: service },
      ],
    });
    const fixture = TestBed.createComponent(AddPasswordDialog);
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('dialog');
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn();
    fixture.componentInstance.open(edit ? entry : undefined);
    await fixture.whenStable();
    const submit = () =>
      fixture.nativeElement
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return { fixture, dialog, response, service, submit };
  }

  it('shows linked field errors and focuses the first invalid input', async () => {
    const { fixture, service, submit } = await setup(false);
    expect(document.activeElement).toBe(
      fixture.nativeElement.querySelector('[formControlName=siteName] input'),
    );
    submit();
    await fixture.whenStable();
    const site = fixture.nativeElement.querySelector('[formControlName=siteName] input');
    expect(document.activeElement).toBe(site);
    expect(site.getAttribute('aria-describedby')).toContain('site-error');
    expect(fixture.nativeElement.querySelector('#password-error').textContent).toContain(
      'required',
    );
    expect(service.create).not.toHaveBeenCalled();
  });

  it('blocks duplicate submissions and dismissal while pending, then retains values on failure', async () => {
    const { fixture, dialog, service, response, submit } = await setup();
    submit();
    submit();
    await fixture.whenStable();
    expect(service.update).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[formControlName=siteName] input').disabled).toBe(
      true,
    );
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    dialog.click();
    expect(dialog.close).not.toHaveBeenCalled();
    response.error(new Error('Unavailable'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[formControlName=siteName] input').value).toBe(
      entry.siteName,
    );
    expect(fixture.nativeElement.querySelector('[formControlName=password] input').value).toBe(
      entry.password,
    );
    expect(fixture.nativeElement.querySelector('[formControlName=siteName] input').disabled).toBe(
      false,
    );
    expect(TestBed.inject(ToastService).toasts().at(-1)?.message).toContain(
      'Please try again',
    );
    submit();
    expect(service.update).toHaveBeenCalledTimes(2);
  });

  it('reveals the still-focused control after validation grows a short dialog', async () => {
    const { fixture, dialog } = await setup(false);
    const cancel = fixture.nativeElement.querySelector('footer button') as HTMLButtonElement;
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 100,
      height: 100,
    } as DOMRect);
    vi.spyOn(cancel, 'getBoundingClientRect').mockReturnValue({
      top: 90,
      bottom: 134,
      height: 44,
    } as DOMRect);
    const scroll = vi.fn();
    cancel.scrollIntoView = scroll;
    cancel.focus();
    await fixture.whenStable();
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest', behavior: 'instant' });
    expect(document.activeElement).toBe(cancel);
  });

  it('emits the saved entry and closes after success', async () => {
    const { fixture, dialog, response, submit } = await setup();
    const saved = vi.fn();
    fixture.componentInstance.passwordSaved.subscribe(saved);
    submit();
    response.next(entry);
    response.complete();
    await fixture.whenStable();
    expect(saved).toHaveBeenCalledWith(entry);
    expect(dialog.close).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('form').getAttribute('aria-busy')).toBe('false');
  });

  it('defaults new passwords to the selected folder and preserves an edited entry’s folder', async () => {
    const { fixture } = await setup(false);
    const store = TestBed.inject(FolderStore);
    store.folders.set([
      { id: 'work', name: 'Work' },
      { id: 'personal', name: 'Personal' },
    ]);
    store.loaded.set(true);
    store.selection.set('work');
    fixture.componentInstance.open();
    await fixture.whenStable();
    const selectedLabel = () => fixture.nativeElement.querySelector('.folder-choice input:checked')?.closest('label')?.textContent;
    expect(selectedLabel()).toContain('Work');
    fixture.componentInstance.open({ ...entry, folderId: 'personal' });
    await fixture.whenStable();
    expect(selectedLabel()).toContain('Personal');
  });

  it('submits explicit null when an existing password is moved to Unfiled', async () => {
    const { fixture, service, submit } = await setup();
    const store = TestBed.inject(FolderStore);
    store.folders.set([{ id: 'work', name: 'Work' }]);
    store.loaded.set(true);
    fixture.componentInstance.open({ ...entry, folderId: 'work' });
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.folder-picker__toggle').click();
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.folder-choice input').click();
    submit();
    expect(service.update).toHaveBeenCalledWith(entry.id, {
      siteName: entry.siteName,
      password: entry.password,
      folderId: null,
    });
  });

  it('expands folder choices and collapses after selection or Escape', async () => {
    const { fixture } = await setup();
    TestBed.inject(FolderStore).folders.set([{ id: 'work', name: 'Work' }]);
    await fixture.whenStable();
    const toggle = fixture.nativeElement.querySelector('.folder-picker__toggle') as HTMLButtonElement;
    const options = fixture.nativeElement.querySelector('.folder-options') as HTMLElement;
    expect(options.hidden).toBe(true);
    toggle.click();
    await fixture.whenStable();
    expect(options.hidden).toBe(false);
    fixture.nativeElement.querySelectorAll('.folder-choice input')[1].click();
    await fixture.whenStable();
    expect(toggle.textContent).toContain('Work');
    expect(options.hidden).toBe(true);
    expect(document.activeElement).toBe(toggle);
    toggle.click();
    await fixture.whenStable();
    toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps a deleted folder selected until the user explicitly chooses a replacement', async () => {
    const { fixture, service, submit } = await setup();
    const store = TestBed.inject(FolderStore);
    store.loaded.set(true);
    fixture.componentInstance.open({ ...entry, folderId: 'deleted' });
    await fixture.whenStable();
    submit();
    await fixture.whenStable();
    expect(service.update).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('no longer available');
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.folder-picker__toggle'));
  });
  it('creates an Unfiled password when opened from Favorites', async () => {
    const { fixture } = await setup(false);
    TestBed.inject(FolderStore).selection.set('favorites');
    fixture.componentInstance.open();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.folder-picker__toggle').textContent).toContain('Unfiled');
    expect(fixture.componentInstance['passwordForm'].controls.folderId.value).toBeNull();
  });
});
