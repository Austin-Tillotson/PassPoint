import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { Dashboard } from './dashboard';
import type { PasswordEntry } from './models/password-entry';
import { PasswordEntriesService } from './services/password-entries.service';

const entries: PasswordEntry[] = [
  {
    id: '1',
    siteName: 'https://alpha.example.com/portal',
    password: 'secret-only-needle',
    createdAtUtc: '',
  },
  {
    id: '2',
    siteName: 'https://beta.example.com/login?next=[home]',
    password: 'Sample',
    createdAtUtc: '',
  },
  { id: '3', siteName: 'https://delta.example.com/account', password: 'Sample', createdAtUtc: '' },
  { id: '4', siteName: 'https://epsilon.example.com/portal', password: 'Sample', createdAtUtc: '' },
  { id: '5', siteName: 'https://gamma.example.com/portal', password: 'Sample', createdAtUtc: '' },
];

async function setup(records: PasswordEntry[] | null = entries) {
  const request = new Subject<PasswordEntry[]>();
  const getAll = vi.fn(() => request);

  await TestBed.configureTestingModule({
    imports: [Dashboard],
    providers: [{ provide: PasswordEntriesService, useValue: { getAll } }],
  }).compileComponents();

  const fixture = TestBed.createComponent(Dashboard);
  await fixture.whenStable();

  if (records) {
    request.next(records);
    request.complete();
    await fixture.whenStable();
  }

  const element = fixture.nativeElement as HTMLElement;
  const query = async (value: string) => {
    const input = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };

  return { fixture, element, request, getAll, query };
}

describe('Dashboard search control', () => {
  it('preserves raw input and clears it while returning focus to search', async () => {
    const { fixture, element, query } = await setup();

    await query('  Portal  ');
    const input = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    expect(input.value).toBe('  Portal  ');

    const clear = element.querySelector<HTMLButtonElement>('[aria-label="Clear search"]')!;
    clear.focus();
    clear.click();
    await fixture.whenStable();

    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
    expect(element.querySelector('[aria-label="Clear search"]')).toBeNull();
  });

  it.each(['loading', 'failure', 'empty'])('hides search for %s', async (state) => {
    const { fixture, element, request } = await setup(null);

    if (state === 'failure') request.error(new Error('Fixture'));
    if (state === 'empty') {
      request.next([]);
      request.complete();
    }
    await fixture.whenStable();

    expect(element.querySelector('input[type="search"]')).toBeNull();
  });

  it('handles a native input clear event', async () => {
    const { element, query } = await setup();

    await query('portal');
    await query('');

    expect(element.querySelector('[aria-label="Clear search"]')).toBeNull();
  });
});
