import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, vi } from 'vitest';
import { ThemeService } from '../../../core/services/theme.service';
import { ThemeToggle } from './theme-toggle';

describe('Theme toggle', () => {
  beforeEach(() => {
    document.documentElement.dataset['theme'] = 'light';
    localStorage.removeItem('passpoint-theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.dataset['theme'] = 'light';
    localStorage.removeItem('passpoint-theme');
    TestBed.resetTestingModule();
  });

  it('switches the document, logo, accessible state, and saved preference together', async () => {
    const fixture = TestBed.createComponent(ThemeToggle);
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    const service = TestBed.inject(ThemeService);
    button.click();
    await fixture.whenStable();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(localStorage.getItem('passpoint-theme')).toBe('dark');
    expect(service.logo()).toBe('passpoint-icon-dark.png');
    button.click();
    await fixture.whenStable();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(localStorage.getItem('passpoint-theme')).toBe('light');
    expect(service.logo()).toBe('passpoint-icon.png');
  });

  it('uses the theme restored before Angular starts', () => {
    document.documentElement.dataset['theme'] = 'dark';
    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
    expect(TestBed.inject(ThemeService).logo()).toBe('passpoint-icon-dark.png');
  });

  it('still switches when saving the preference is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError');
    });
    const service = TestBed.inject(ThemeService);
    expect(() => service.toggle()).not.toThrow();
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(service.theme()).toBe('dark');
  });
});
