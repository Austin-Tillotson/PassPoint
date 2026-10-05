import { TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import { PasswordGeneratorState } from '../../core/services/password-generator-state';
import { ToastService } from '../../core/services/toast.service';
import { PasswordGenerator } from './password-generator';

describe('Password generator dialog', () => {
  afterEach(() => vi.unstubAllGlobals());

  async function setup() {
    const fixture = TestBed.createComponent(PasswordGenerator);
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = () => dialog.setAttribute('open', '');
    dialog.close = () => dialog.removeAttribute('open');
    const state = TestBed.inject(PasswordGeneratorState);
    state.open.set(true);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return { fixture, state, element };
  }

  it('generates on opening and updates the result when length or options change', async () => {
    const { fixture, element } = await setup();
    expect(element.querySelector('output')!.textContent!.trim()).toHaveLength(16);
    const length = element.querySelector<HTMLInputElement>('input[type="range"]')!;
    length.value = '100';
    length.dispatchEvent(new Event('input'));
    const letters = element.querySelector<HTMLInputElement>('[formControlName="letters"]')!;
    const symbols = element.querySelector<HTMLInputElement>('[formControlName="specialCharacters"]')!;
    letters.click();
    symbols.click();
    await fixture.whenStable();
    expect(element.querySelector('output')!.textContent!.trim()).toMatch(/^\d{100}$/);
    expect(element.querySelector<HTMLInputElement>('[formControlName="numbers"]')!.disabled).toBe(true);
    expect(element.querySelector<HTMLInputElement>('[formControlName="uppercase"]')!.disabled).toBe(true);
  });

  it('closes on the backdrop, clears the password and can reopen', async () => {
    const { fixture, element, state } = await setup();
    element.querySelector('dialog')!.click();
    await fixture.whenStable();
    expect(state.open()).toBe(false);
    expect(element.querySelector('output')!.textContent!.trim()).toBe('');
    state.open.set(true);
    await fixture.whenStable();
    expect(element.querySelector('dialog')!.open).toBe(true);
    expect(element.querySelector('output')!.textContent!.trim()).toHaveLength(16);
  });

  it('copies the displayed result and reports clipboard errors through toasts', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { userAgent: navigator.userAgent, clipboard: { writeText } });
    const { fixture, element } = await setup();
    const button = element.querySelector<HTMLButtonElement>('.button--primary')!;
    button.click();
    await fixture.whenStable();
    expect(writeText).toHaveBeenCalledWith(element.querySelector('output')!.textContent!.trim());
    expect(TestBed.inject(ToastService).toasts().at(-1)?.kind).toBe('success');
    writeText.mockRejectedValue(new Error('Denied'));
    button.click();
    await fixture.whenStable();
    expect(TestBed.inject(ToastService).toasts().at(-1)?.kind).toBe('error');
  });
});
