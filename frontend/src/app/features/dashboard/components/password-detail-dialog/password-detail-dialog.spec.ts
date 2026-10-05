import { ToastService } from '../../../../core/services/toast.service';
import { TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import { PasswordDetailDialog } from './password-detail-dialog';

describe('Password details', () => {
  afterEach(() => vi.unstubAllGlobals());
  const entry = {
    id: '1',
    siteName: 'https://example.com',
    password: 'Sample-only',
    createdAtUtc: '2026-09-25T12:00:00Z',
  };

  async function setup() {
    const fixture = TestBed.createComponent(PasswordDetailDialog);
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('dialog');
    dialog.showModal = vi.fn();
    dialog.close = vi.fn();
    fixture.componentInstance.open(entry);
    await fixture.whenStable();
    return { fixture, dialog, component: fixture.componentInstance };
  }

  it('copies a masked password and keeps the toast when another entry opens', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { fixture, component } = await setup();
    fixture.nativeElement.querySelector('.password-detail__copy').click();
    await fixture.whenStable();
    expect(writeText).toHaveBeenCalledWith(entry.password);
    expect(fixture.nativeElement.querySelector('code').textContent).toBe('••••••••');
    expect(TestBed.inject(ToastService).toasts().at(-1)?.message).toBe('Password copied.');
    component.open({ ...entry, id: '2' });
    await fixture.whenStable();
    expect(TestBed.inject(ToastService).toasts()).toHaveLength(1);
  });

  it('masks the password again when reopening an entry', async () => {
    const { fixture, component } = await setup();
    fixture.nativeElement.querySelector('.password-detail__password [aria-pressed]').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('code').textContent).toBe(entry.password);
    component.close();
    component.open(entry);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('code').textContent).toBe('••••••••');
  });

  it('closes details before requesting edit for the selected entry', async () => {
    const { fixture, component, dialog } = await setup();
    const edited = vi.fn(() => expect(dialog.close).toHaveBeenCalledOnce());
    component.editRequested.subscribe(edited);
    fixture.nativeElement.querySelector('footer button').click();
    expect(edited).toHaveBeenCalledWith(entry);
  });

  it('labels only the entry being deleted while blocking overlapping actions', async () => {
    const { fixture } = await setup();
    fixture.componentRef.setInput('isDeleting', true);
    fixture.componentRef.setInput('deletingEntryId', 'other');
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector(
      'footer button:last-child',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).not.toContain('Deleting');
    fixture.componentRef.setInput('deletingEntryId', entry.id);
    await fixture.whenStable();
    expect(button.textContent).toContain('Deleting');
  });

  it('requests deletion without closing details', async () => {
    const { fixture, component, dialog } = await setup();
    const deleted = vi.fn();
    component.deleteRequested.subscribe(deleted);
    fixture.nativeElement.querySelector('footer button:last-child').click();
    expect(deleted).toHaveBeenCalledWith(entry);
    expect(dialog.close).not.toHaveBeenCalled();

  });
});
