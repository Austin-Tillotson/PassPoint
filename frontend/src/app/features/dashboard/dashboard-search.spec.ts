import { ToastService } from '../../core/services/toast.service';
import { provideRouter } from '@angular/router';
import { FolderStore } from '../../core/services/folder-store';
import { FoldersService } from '../../core/services/folders.service';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { AddPasswordDialog } from './components/add-password-dialog/add-password-dialog';
import { PasswordDetailDialog } from './components/password-detail-dialog/password-detail-dialog';
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
  const deletion = new Subject<void>();
  const savedEntry = new Subject<PasswordEntry>();
  const update = vi.fn(() => savedEntry);

  await TestBed.configureTestingModule({
    imports: [Dashboard],
    providers: [
      provideRouter([]),
      FolderStore,
      { provide: FoldersService, useValue: {} },
      { provide: PasswordEntriesService, useValue: { getAll, delete: () => deletion, update } },
    ],
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

  const add = fixture.debugElement.query(By.directive(AddPasswordDialog))
    .componentInstance as AddPasswordDialog;
  const detail = fixture.debugElement.query(By.directive(PasswordDetailDialog))
    .componentInstance as PasswordDetailDialog;

  return { fixture, element, request, getAll, query, add, detail, deletion, savedEntry, update };
}

describe('Dashboard search control', () => {
  it('synchronizes name header sorting with the dropdown and leaves Actions inert', async () => {
    const { fixture, element } = await setup();
    const select = element.querySelector<HTMLSelectElement>('.collection-sort')!;
    const site = element.querySelector<HTMLButtonElement>('.password-list__heading button')!;
    const ids = () => [...element.querySelectorAll('[data-entry-id]')].map(row => row.getAttribute('data-entry-id'));
    site.click();
    await fixture.whenStable();
    expect(select.value).toBe('name-desc');
    expect(ids()).toEqual(['5', '4', '3', '2', '1']);
    site.click();
    await fixture.whenStable();
    expect(select.value).toBe('name');
    expect(ids()).toEqual(['1', '2', '3', '4', '5']);
    select.value = 'name-desc';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(site.textContent).toContain('↓');
    element.querySelector<HTMLElement>('.password-list__heading > span:last-child')!.click();
    await fixture.whenStable();
    expect(select.value).toBe('name-desc');
    expect(ids()).toEqual(['5', '4', '3', '2', '1']);
  });

  it('sorts folders in navigation order and favorites first with alphabetical ties', async () => {
    const records = entries.map((entry, index) => ({
      ...entry,
      folderId: ['work', 'personal', null, 'work', 'personal'][index],
      isFavorite: index === 1 || index === 4,
    }));
    const { fixture, element, query } = await setup(records);
    const store = TestBed.inject(FolderStore);
    store.folders.set([{ id: 'personal', name: 'Personal' }, { id: 'work', name: 'Work' }]);
    const select = element.querySelector<HTMLSelectElement>('.collection-sort')!;
    const ids = () => [...element.querySelectorAll('[data-entry-id]')].map(row => row.getAttribute('data-entry-id'));
    element.querySelector<HTMLButtonElement>('.password-list__folder-heading')!.click();
    await fixture.whenStable();
    expect(select.value).toBe('folder');
    expect(ids()).toEqual(['3', '2', '5', '1', '4']);
    store.folders.set([{ id: 'work', name: 'Work' }, { id: 'personal', name: 'Personal' }]);
    await fixture.whenStable();
    expect(ids()).toEqual(['3', '1', '4', '2', '5']);
    select.value = 'favorites';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(ids()).toEqual(['2', '5', '1', '3', '4']);
    await query('portal');
    expect(ids()).toEqual(['5', '1', '4']);
    element.querySelector<HTMLButtonElement>('[aria-label="Grid view"]')!.click();
    await fixture.whenStable();
    expect(ids()).toEqual(['5', '1', '4']);
  });

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

describe('Dashboard display controls', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sorts loaded entries by site rather than protocol without mutating the response', async () => {
    const records = [
      { ...entries[0], id: 'z', siteName: 'http://zebra.example.com' },
      { ...entries[0], id: 'a', siteName: 'https://www.alpha.example.com' },
    ];
    const { element } = await setup(records);

    expect(
      Array.from(element.querySelectorAll<HTMLElement>('[data-entry-id]')).map(
        (row) => row.dataset['entryId'],
      ),
    ).toEqual(['a', 'z']);
    expect(records.map((entry) => entry.id)).toEqual(['z', 'a']);
    expect(
      element.querySelector('select[aria-label="Sort passwords"] option')?.textContent,
    ).toContain('A–Z');
  });

  it('preserves search and entry identity across list/grid switches and opens the same details', async () => {
    const { fixture, element, query, detail } = await setup();
    const open = vi.spyOn(detail, 'open').mockImplementation(() => {});
    await query('portal');
    const row = element.querySelector('[data-entry-id="1"]');
    const grid = element.querySelector<HTMLButtonElement>('[aria-label="Grid view"]')!;
    const list = element.querySelector<HTMLButtonElement>('[aria-label="List view"]')!;

    grid.focus();
    grid.click();
    await fixture.whenStable();

    expect(grid.getAttribute('aria-pressed')).toBe('true');
    expect(list.getAttribute('aria-pressed')).toBe('false');
    expect(document.activeElement).toBe(grid);
    expect(element.querySelectorAll('.password-row--grid')).toHaveLength(3);
    expect(element.querySelector('.password-list__heading')).toBeNull();
    expect(element.querySelector('[data-entry-id="1"]')).toBe(row);
    element.querySelector<HTMLButtonElement>('.password-row__site')!.click();
    expect(open).toHaveBeenCalledWith(entries[0]);

    await query('no-such-site');
    expect(element.querySelector('.dashboard-no-matches')).not.toBeNull();
    element.querySelector<HTMLButtonElement>('.dashboard-search-reset')!.click();
    await fixture.whenStable();
    expect(element.querySelectorAll('.password-row--grid')).toHaveLength(5);

    list.click();
    await fixture.whenStable();
    expect(element.querySelector('.password-row--grid')).toBeNull();
    expect(element.querySelector('.password-list__heading')).not.toBeNull();
    expect(list.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Dashboard site filtering', () => {
  it.each([
    ['', ['1', '2', '3', '4', '5']],
    ['   ', ['1', '2', '3', '4', '5']],
    ['example.com', ['1', '2', '3', '4', '5']],
    ['alpha.example', ['1']],
    ['/portal', ['1', '4', '5']],
    ['  PoRtAl  ', ['1', '4', '5']],
    ['[home]', ['2']],
    ['?next=', ['2']],
    ['.*', []],
    ['secret-only-needle', []],
    ['no-such-site', []],
  ])('matches only site URL substrings for %s', async (value, ids) => {
    const { element, getAll, query } = await setup();

    await query(value as string);

    expect(
      Array.from(element.querySelectorAll<HTMLElement>('[data-entry-id]')).map(
        (row) => row.dataset['entryId'],
      ),
    ).toEqual(ids);
    expect(getAll).toHaveBeenCalledOnce();
  });

  it('clearing restores canonical rows and unchanged row identity without fetching', async () => {
    const { fixture, element, getAll, query } = await setup();
    const firstRow = element.querySelector('[data-entry-id="1"]');

    await query('portal');
    expect(element.querySelector('[data-entry-id="1"]')).toBe(firstRow);
    (element.querySelector('[aria-label="Clear search"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(element.querySelectorAll('[data-entry-id]').length).toBe(5);
    expect(element.querySelector('[data-entry-id="1"]')).toBe(firstRow);
    expect(getAll).toHaveBeenCalledOnce();
  });
});

describe('Dashboard search results feedback', () => {
  it('keeps one polite results region and input focus while counts change', async () => {
    const { element, query } = await setup();
    const status = element.querySelector('[aria-label="Search results"]')!;
    const input = element.querySelector('input[type="search"]');

    expect(status.textContent).toBe('5 passwords');
    expect(element.querySelector('.collection-heading')?.textContent).toContain('All passwords');
    expect(element.querySelector('.collection-heading__count')?.textContent).toBe('5');
    expect(status.getAttribute('aria-live')).toBe('polite');
    await query('alpha');
    expect(status.textContent).toBe('1 of 5 passwords');
    await query('portal');
    expect(status.textContent).toBe('3 of 5 passwords');
    await query('no-such-site');

    expect(status.textContent).toBe('0 of 5 passwords');
    expect(element.querySelector('.collection-heading__count')?.textContent).toBe('0');
    expect(element.querySelector('[aria-label="Search results"]')).toBe(status);
    expect(element.querySelectorAll('[aria-label="Search results"]').length).toBe(1);
    expect(document.activeElement).toBe(input);
    expect(element.textContent).toContain('No matching passwords');
    expect(element.textContent).not.toContain('No passwords yet');
    expect((element.querySelector('.dashboard-heading__add') as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('clears no matches back to all rows and focuses search', async () => {
    const { fixture, element, query } = await setup();
    await query('no-such-site');

    const clear = element.querySelector<HTMLButtonElement>('.dashboard-search-reset')!;
    clear.focus();
    clear.click();
    await fixture.whenStable();

    expect(element.querySelector('.dashboard-no-matches')).toBeNull();
    expect(element.querySelectorAll('[data-entry-id]').length).toBe(5);
    expect(document.activeElement).toBe(element.querySelector('input[type="search"]'));
  });

  it('uses singular wording for a one-entry collection', async () => {
    const { element, query } = await setup([entries[0]]);
    expect(element.querySelector('[aria-label="Search results"]')?.textContent).toBe('1 password');

    await query('no-such-site');

    expect(element.querySelector('[aria-label="Search results"]')?.textContent).toBe(
      '0 of 1 password',
    );
  });

  it('does not describe a truly empty collection as no matches', async () => {
    const { element } = await setup([]);

    expect(element.textContent).toContain('No passwords yet');
    expect(element.querySelector('.dashboard-no-matches')).toBeNull();
    expect(element.querySelector('[aria-label="Search results"]')?.textContent).toBe('');
  });
});

describe('Dashboard search during management', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([true, false])(
    'retains query and recomputes a matching/nonmatching add: %s',
    async (matches) => {
      const { fixture, element, query, add } = await setup();
      await query('portal');

      add.passwordSaved.emit({
        ...entries[0],
        id: 'new',
        siteName: matches ? 'https://new.example.com/portal' : 'https://new.example.com/account',
      });
      await fixture.whenStable();

      expect(element.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('portal');
      expect(element.querySelectorAll('[data-entry-id]').length).toBe(matches ? 4 : 3);
      expect((TestBed.inject(ToastService).toasts().at(-1)?.message ?? '')).toBe(
        matches ? 'Password added' : 'Password added. This entry does not match your search.',
      );
    },
  );

  it.each([true, false])(
    'submits through the edit dialog and restores focus when the row stays/leaves results: %s',
    async (matches) => {
      const { fixture, element, query, savedEntry, update } = await setup();
      await query('portal');

      // JSDOM does not implement native modal focus restoration. Stub only
      // that browser boundary; keep component opening, submission, and outputs real.
      for (const dialog of element.querySelectorAll<HTMLDialogElement>('dialog')) {
        let returnTarget: HTMLElement | null = null;
        dialog.showModal = vi.fn(() => {
          returnTarget = document.activeElement as HTMLElement;
          dialog.setAttribute('open', '');
          dialog.querySelector<HTMLElement>('button, input')?.focus();
        });
        dialog.close = vi.fn(() => {
          dialog.removeAttribute('open');
          returnTarget?.focus();
        });
      }

      const row = element.querySelector<HTMLButtonElement>(
        '[data-entry-id="1"] .password-row__site',
      )!;
      row.focus();
      row.click();
      await fixture.whenStable();

      const details = element.querySelector<HTMLDialogElement>(
        'app-password-detail-dialog dialog',
      )!;
      expect(details.open).toBe(true);
      details.querySelector<HTMLButtonElement>('footer button')!.click();
      await fixture.whenStable();

      const formDialog = element.querySelector<HTMLDialogElement>(
        'app-add-password-dialog dialog',
      )!;
      const site = formDialog.querySelector<HTMLInputElement>(
        '[formControlName="siteName"] input',
      )!;
      expect(details.open).toBe(false);
      expect(formDialog.open).toBe(true);
      expect(site.value).toBe(entries[0].siteName);
      expect(document.activeElement).toBe(site);

      const editedEntry = {
        ...entries[0],
        siteName: matches
          ? 'https://alpha.example.com/portal-new'
          : 'https://alpha.example.com/account',
      };
      site.value = editedEntry.siteName;
      site.dispatchEvent(new Event('input', { bubbles: true }));
      formDialog
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await fixture.whenStable();

      expect(update).toHaveBeenCalledExactlyOnceWith(entries[0].id, {
        folderId: null,
        username: '',
        siteName: editedEntry.siteName,
        password: entries[0].password,
      });
      expect(formDialog.open).toBe(true);
      expect((TestBed.inject(ToastService).toasts().at(-1)?.message ?? '')).toBe('');

      savedEntry.next(editedEntry);
      savedEntry.complete();
      await fixture.whenStable();

      expect(formDialog.open).toBe(false);
      expect(element.querySelectorAll('[data-entry-id]')).toHaveLength(matches ? 3 : 2);
      expect(element.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('portal');
      expect((TestBed.inject(ToastService).toasts().at(-1)?.message ?? '')).toBe(
        matches ? 'Password updated' : 'Password updated. This entry does not match your search.',
      );
      expect(document.activeElement).toBe(
        matches ? row : element.querySelector('input[type="search"]'),
      );
    },
  );

  it('does not steal focus from another selected control after an edit leaves results', async () => {
    const { fixture, element, query, add, detail } = await setup();
    await query('portal');
    element.querySelector<HTMLButtonElement>('.password-row__site')!.focus();
    vi.spyOn(add, 'open').mockImplementation(() => {});
    detail.editRequested.emit(entries[0]);
    add.passwordSaved.emit({ ...entries[0], siteName: 'https://alpha.example.com/account' });
    const heading = element.querySelector<HTMLButtonElement>('.dashboard-heading__add')!;
    heading.focus();
    await fixture.whenStable();

    expect(document.activeElement).toBe(heading);
  });

  it('recomputes when an edit enters results without clearing the query', async () => {
    const { fixture, element, query, add } = await setup();
    await query('portal');

    add.passwordSaved.emit({ ...entries[1], siteName: 'https://beta.example.com/portal' });
    await fixture.whenStable();

    expect(element.querySelectorAll('[data-entry-id]').length).toBe(4);
    expect(element.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('portal');
    expect((TestBed.inject(ToastService).toasts().at(-1)?.message ?? '')).toBe('Password updated');
  });

  it.each([0, 1, 2])('focuses a visible neighbor after filtered deletion %s', async (index) => {
    const { fixture, element, query, detail, deletion } = await setup();
    await query('portal');
    const visible = [entries[0], entries[3], entries[4]];
    const row = element.querySelectorAll<HTMLButtonElement>('.password-row__site')[index];
    row.focus();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    detail.deleteRequested.emit(visible[index]);
    deletion.next();
    deletion.complete();
    await fixture.whenStable();

    const expectedId = index === 0 ? '4' : index === 1 ? '5' : '4';
    expect(document.activeElement).toBe(
      element.querySelector('[data-entry-id="' + expectedId + '"] .password-row__site'),
    );
    expect(element.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('portal');
    expect(element.querySelector('.search-results')?.textContent).toBe('2 of 4 passwords');
  });

  it('focuses no-match Clear after deleting the last match with hidden entries left', async () => {
    const { fixture, element, query, detail, deletion } = await setup();
    await query('alpha');
    element.querySelector<HTMLButtonElement>('.password-row__site')!.focus();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    detail.deleteRequested.emit(entries[0]);
    deletion.next();
    deletion.complete();
    await fixture.whenStable();

    expect(element.querySelector('.search-results')?.textContent).toBe('0 of 4 passwords');
    expect(document.activeElement).toBe(element.querySelector('.dashboard-search-reset'));
  });

  it('clears the query after final stored-entry deletion before the next first save', async () => {
    const { fixture, element, query, detail, deletion, add } = await setup([entries[0]]);
    await query('alpha');
    element.querySelector<HTMLButtonElement>('.password-row__site')!.focus();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    detail.deleteRequested.emit(entries[0]);
    deletion.next();
    deletion.complete();
    await fixture.whenStable();
    expect(document.activeElement).toBe(element.querySelector('.dashboard-state button'));
    expect(element.querySelector('input[type="search"]')).toBeNull();

    add.passwordSaved.emit(entries[1]);
    await fixture.whenStable();
    expect(element.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('');
    expect(element.querySelectorAll('[data-entry-id]').length).toBe(1);
  });

  it('allows dismissing a nonmatching-save toast without changing the search', async () => {
    const { fixture, element, query, add } = await setup();
    await query('no-such-site');
    add.passwordSaved.emit({ ...entries[0], id: 'new' });
    await fixture.whenStable();
    const toasts = TestBed.inject(ToastService);
    toasts.dismiss(toasts.toasts()[0].id);
    await fixture.whenStable();

    expect(element.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('no-such-site');
    expect((TestBed.inject(ToastService).toasts().at(-1)?.message ?? '')).toBe('');
  });

  it('keeps the query and visible row after failed deletion', async () => {
    const { fixture, element, query, detail, deletion } = await setup();
    await query('alpha');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    detail.deleteRequested.emit(entries[0]);
    deletion.error(new Error('Fixture'));
    await fixture.whenStable();

    expect(element.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('alpha');
    expect(element.querySelectorAll('[data-entry-id]').length).toBe(1);
    expect(TestBed.inject(ToastService).toasts().at(-1)?.message).toContain('Unable to delete');
  });
});
