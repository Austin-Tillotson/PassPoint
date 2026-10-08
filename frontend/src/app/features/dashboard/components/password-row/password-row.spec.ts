import { ToastService } from '../../../../core/services/toast.service';
import { TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import { PasswordRow } from './password-row';

describe('Password row copying', () => {
  afterEach(() => vi.unstubAllGlobals());

  async function setup(writeText: ReturnType<typeof vi.fn>) {
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const fixture = TestBed.createComponent(PasswordRow);
    fixture.componentRef.setInput('siteName', 'https://example.com');
    fixture.componentRef.setInput('password', 'Sample-only');
    fixture.componentRef.setInput('folderName', 'Work');
    await fixture.whenStable();
    return fixture;
  }

  it('copies the exact password without opening details or rendering the secret', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const fixture = await setup(writeText);
    const details = vi.fn();
    fixture.componentInstance.detailsRequested.subscribe(details);
    fixture.nativeElement.querySelector('.password-row__copy').click();
    await fixture.whenStable();
    expect(writeText).toHaveBeenCalledWith('Sample-only');
    expect(details).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Sample-only');
    expect(TestBed.inject(ToastService).toasts().at(-1)?.message).toBe('Password copied.');
    expect(fixture.nativeElement.querySelector('.password-row__folder').textContent).toContain('Work');
  });

  it('reports clipboard failure and allows retry', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Denied'));
    const fixture = await setup(writeText);
    const button = fixture.nativeElement.querySelector('.password-row__copy');
    button.click();
    await fixture.whenStable();
    expect(button.disabled).toBe(false);
    expect(TestBed.inject(ToastService).toasts().at(-1)?.message).toContain('Unable to copy');
    writeText.mockResolvedValue(undefined);
    button.click();
    await fixture.whenStable();
    expect(TestBed.inject(ToastService).toasts().at(-1)?.kind).toBe('success');
    expect(writeText).toHaveBeenCalledTimes(2);
  });

  it('keeps a blank list cell but omits the empty username section in grid view', async () => {
    const fixture = await setup(vi.fn());
    expect(fixture.nativeElement.querySelector('.password-row__username').textContent.trim()).toBe('');
    fixture.componentRef.setInput('grid', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.password-row__username')).toBeNull();
    fixture.componentRef.setInput('username', 'gitdemouser123');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.password-row__username').textContent).toContain('gitdemouser123');
    expect(fixture.nativeElement.querySelector('.password-row__username').nextElementSibling.className).toBe('password-row__password');
    expect(fixture.nativeElement.textContent).not.toContain('Sample-only');
  });
});
