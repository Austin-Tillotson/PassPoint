import { ToastService } from '../../core/services/toast.service';
import { Component } from '@angular/core';
import type { PasswordEntry } from './models/password-entry';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { FolderStore } from '../../core/services/folder-store';
import { FoldersService } from '../../core/services/folders.service';
import { Dashboard } from './dashboard';
import { PasswordEntriesService } from './services/password-entries.service';

@Component({ template: '' })
class TestPage {}

describe('Favorite controls', () => {
  async function setup(
    records: PasswordEntry[] = [
      {
        id: '1',
        siteName: 'https://example.com',
        password: 'demo',
        createdAtUtc: '',
        folderId: 'work',
        isFavorite: false,
      },
    ],
  ) {
    const getAll = vi.fn(() => of(records));
    const responses: Subject<{ id: string; isFavorite: boolean }>[] = [];
    const setFavorite = vi.fn(() => {
      const response = new Subject<{ id: string; isFavorite: boolean }>();
      responses.push(response);
      return response;
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'dashboard', component: TestPage }]),
        FolderStore,
        { provide: FoldersService, useValue: {} },
        {
          provide: PasswordEntriesService,
          useValue: {
            getAll,
            setFavorite,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    for (const dialog of element.querySelectorAll('dialog')) {
      dialog.showModal = () => dialog.setAttribute('open', '');
      dialog.close = () => {
        if (dialog.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
        dialog.removeAttribute('open');
      };
    }
    return { fixture, element, responses, setFavorite, getAll };
  }

  it('shows four alphabetical quick favorites and opens their details', async () => {
    const records = ['zebra', 'bravo', 'alpha', 'delta', 'echo'].map((name, index) => ({
      id: String(index), siteName: `https://${name}.example`, password: 'demo',
      createdAtUtc: '', isFavorite: true,
    }));
    const { element, fixture } = await setup(records);
    const tiles = element.querySelectorAll<HTMLButtonElement>('app-quick-favorites button');
    expect(tiles).toHaveLength(4);
    expect([...tiles].map(tile => tile.querySelector('strong')?.textContent)).toEqual([
      'alpha.example', 'bravo.example', 'delta.example', 'echo.example',
    ]);
    tiles[0].click();
    await fixture.whenStable();
    expect(element.querySelector('#password-detail-title')?.textContent).toContain('alpha.example');
    expect(element.querySelector('app-password-detail-dialog dialog')?.hasAttribute('open')).toBe(true);
    const search = element.querySelector<HTMLInputElement>('#dashboard-search')!;
    search.value = 'bravo';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(element.querySelector('app-quick-favorites')).toBeNull();
  });

  it('adds quick favorites after success and hides them in the Favorites collection', async () => {
    const { element, fixture, responses } = await setup();
    expect(element.querySelector('app-quick-favorites')).toBeNull();
    element.querySelector<HTMLButtonElement>('.password-row__favorite')!.click();
    responses[0].next({ id: '1', isFavorite: true });
    responses[0].complete();
    await fixture.whenStable();
    expect(element.querySelectorAll('app-quick-favorites button')).toHaveLength(1);
    await TestBed.inject(Router).navigateByUrl('/dashboard?collection=favorites');
    await fixture.whenStable();
    expect(element.querySelector('app-quick-favorites')).toBeNull();
  });

  it('blocks duplicate requests and updates only after success', async () => {
    const { fixture, element, responses, setFavorite } = await setup();
    const star = element.querySelector<HTMLButtonElement>('.password-row__favorite')!;
    star.focus();
    star.click();
    star.focus();
    star.click();
    await fixture.whenStable();
    expect(setFavorite).toHaveBeenCalledExactlyOnceWith('1', true);
    expect(star.disabled).toBe(true);
    expect(star.getAttribute('aria-pressed')).toBe('false');
    responses[0].next({ id: '1', isFavorite: true });
    responses[0].complete();
    await fixture.whenStable();
    expect(star.disabled).toBe(false);
    expect(star.getAttribute('aria-pressed')).toBe('true');
    expect(TestBed.inject(ToastService).toasts().at(-1)?.message).toBe('Added to favorites');
    expect(document.activeElement).toBe(star);
  });

  it('retains the flag on failure and allows retry', async () => {
    const { fixture, element, responses, setFavorite } = await setup();
    const star = element.querySelector<HTMLButtonElement>('.password-row__favorite')!;
    star.focus();
    star.click();
    responses[0].error(new Error('offline'));
    await fixture.whenStable();
    expect(star.getAttribute('aria-pressed')).toBe('false');
    expect(star.disabled).toBe(false);
    expect(TestBed.inject(ToastService).toasts().at(-1)?.message).toContain(
      'Please try again',
    );
    star.focus();
    star.click();
    expect(setFavorite).toHaveBeenCalledTimes(2);
  });

  it('keeps list and detail state synchronized without opening details from the star', async () => {
    const { fixture, element, responses } = await setup();
    element.querySelector<HTMLButtonElement>('.password-row__favorite')!.click();
    expect(element.querySelector('app-password-detail-dialog dialog')!.hasAttribute('open')).toBe(
      false,
    );
    responses[0].next({ id: '1', isFavorite: true });
    responses[0].complete();
    element.querySelector<HTMLButtonElement>('.password-row__site')!.click();
    await fixture.whenStable();
    const star = element.querySelector<HTMLButtonElement>('.password-detail__favorite')!;
    expect(star.getAttribute('aria-pressed')).toBe('true');
    star.focus();
    star.click();
    await fixture.whenStable();
    expect(
      element.querySelector<HTMLButtonElement>('app-password-detail-dialog footer button')!
        .disabled,
    ).toBe(true);
    responses[1].next({ id: '1', isFavorite: false });
    responses[1].complete();
    await fixture.whenStable();
    expect(star.getAttribute('aria-pressed')).toBe('false');
    expect(element.querySelector('.password-row__favorite')!.getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('uses the same favorite status in grid view', async () => {
    const { fixture, element, responses } = await setup();
    element.querySelector<HTMLButtonElement>('[aria-label="Grid view"]')!.click();
    await fixture.whenStable();
    element.querySelector<HTMLButtonElement>('.password-row__favorite')!.click();
    responses[0].next({ id: '1', isFavorite: true });
    responses[0].complete();
    await fixture.whenStable();
    expect(
      element
        .querySelector('.password-row--grid .password-row__favorite')
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('filters favorites across folders without reloading and keeps them when a folder is deleted', async () => {
    const records = [
      {
        id: '1',
        siteName: 'https://work.example',
        password: 'demo',
        createdAtUtc: '',
        folderId: 'work',
        isFavorite: true,
      },
      {
        id: '2',
        siteName: 'https://unfiled.example',
        password: 'demo',
        createdAtUtc: '',
        folderId: null,
        isFavorite: true,
      },
      {
        id: '3',
        siteName: 'https://other.example',
        password: 'demo',
        createdAtUtc: '',
        folderId: null,
        isFavorite: false,
      },
    ];
    const { fixture, element, getAll } = await setup(records);
    const router = TestBed.inject(Router);
    const store = TestBed.inject(FolderStore);
    store.loaded.set(true);
    await router.navigateByUrl('/dashboard?collection=favorites');
    await fixture.whenStable();
    expect(router.url).toContain('collection=favorites');
    expect(element.querySelector('.collection-heading')?.textContent).toContain('Favorites');
    expect(element.querySelector('.collection-heading__count')?.textContent?.trim()).toBe('2');
    expect(element.querySelectorAll('[data-entry-id]')).toHaveLength(2);
    store.removeFolder('work');
    await fixture.whenStable();
    expect(element.querySelectorAll('[data-entry-id]')).toHaveLength(2);
    const search = element.querySelector<HTMLInputElement>('input[type=search]')!;
    search.value = 'work';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(element.querySelectorAll('[data-entry-id]')).toHaveLength(1);
    expect(element.querySelector('.search-results')?.textContent).toBe('1 of 2 passwords');
    await router.navigateByUrl('/dashboard?collection=unfiled');
    await fixture.whenStable();
    expect(element.querySelectorAll('[data-entry-id]')).toHaveLength(3);
    expect(getAll).toHaveBeenCalledTimes(1);
  });

  it('keeps the last favorite on failure, then focuses View all passwords after successful removal', async () => {
    const { fixture, element, responses } = await setup([
      {
        id: '1',
        siteName: 'https://example.com',
        password: 'demo',
        createdAtUtc: '',
        isFavorite: true,
      },
    ]);
    await TestBed.inject(Router).navigateByUrl('/dashboard?collection=favorites');
    await fixture.whenStable();
    let star = element.querySelector<HTMLButtonElement>('.password-row__favorite')!;
    star.focus();
    star.click();
    responses[0].error(new Error('offline'));
    await fixture.whenStable();
    expect(element.querySelectorAll('[data-entry-id]')).toHaveLength(1);
    star = element.querySelector<HTMLButtonElement>('.password-row__favorite')!;
    star.focus();
    star.click();
    responses[1].next({ id: '1', isFavorite: false });
    responses[1].complete();
    await fixture.whenStable();
    expect(element.textContent).toContain('No favorites yet');
    expect(element.querySelector('.collection-heading__count')?.textContent?.trim()).toBe('0');
    expect(document.activeElement).toBe(element.querySelector('.dashboard-state a'));
    await TestBed.inject(Router).navigateByUrl('/dashboard');
    await fixture.whenStable();
    expect(element.querySelectorAll('[data-entry-id]')).toHaveLength(1);
  });

  it('closes details and focuses the remaining entry when unfavoriting from Favorites', async () => {
    const { fixture, element, responses } = await setup([
      {
        id: '1',
        siteName: 'https://alpha.example',
        password: 'demo',
        createdAtUtc: '',
        isFavorite: true,
      },
      {
        id: '2',
        siteName: 'https://beta.example',
        password: 'demo',
        createdAtUtc: '',
        isFavorite: true,
      },
    ]);
    await TestBed.inject(Router).navigateByUrl('/dashboard?collection=favorites');
    await fixture.whenStable();
    element.querySelector<HTMLButtonElement>('.password-row__site')!.click();
    await fixture.whenStable();
    const star = element.querySelector<HTMLButtonElement>('.password-detail__favorite')!;
    star.focus();
    star.click();
    responses[0].next({ id: '1', isFavorite: false });
    responses[0].complete();
    await fixture.whenStable();
    expect(element.querySelector('app-password-detail-dialog dialog')!.hasAttribute('open')).toBe(
      false,
    );
    expect(document.activeElement).toBe(
      element.querySelector('[data-entry-id="2"] .password-row__site'),
    );
  });
});
