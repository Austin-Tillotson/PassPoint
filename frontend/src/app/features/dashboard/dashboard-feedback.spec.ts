import { provideRouter } from '@angular/router';
import { FolderStore } from '../../core/services/folder-store';
import { FoldersService } from '../../core/services/folders.service';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';

import { Dashboard } from './dashboard';
import { AddPasswordDialog } from './components/add-password-dialog/add-password-dialog';
import { PasswordDetailDialog } from './components/password-detail-dialog/password-detail-dialog';
import { PasswordEntriesService } from './services/password-entries.service';

const entries = ['alpha', 'beta', 'gamma'].map((name, i) => ({
  id: String(i),
  siteName: 'https://' + name + '.example.com',
  password: 'Sample',
  createdAtUtc: '',
}));
describe('Dashboard action feedback', () => {
  async function setup(records = entries) {
    const deletion = new Subject<void>();
    const remove = vi.fn(() => deletion);

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([]), FolderStore, { provide: FoldersService, useValue: {} },
        {
          provide: PasswordEntriesService,
          useValue: { getAll: () => of(records), delete: remove },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const add = fixture.debugElement.query(By.directive(AddPasswordDialog))
      .componentInstance as AddPasswordDialog;
    const detail = fixture.debugElement.query(By.directive(PasswordDetailDialog))
      .componentInstance as PasswordDetailDialog;

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    return { fixture, element, deletion, remove, add, detail };
  }

  afterEach(() => vi.restoreAllMocks());

  it('confirms add and edit once in a persistent polite region without moving focus', async () => {
    const { fixture, element, add } = await setup();
    const heading = element.querySelector('.dashboard-heading__add') as HTMLButtonElement;
    heading.focus();

    add.passwordSaved.emit({ ...entries[0], id: 'new' });
    await fixture.whenStable();
    expect(element.querySelector('.dashboard-feedback [role="status"]')?.textContent).toBe(
      'Password added',
    );

    const announcement = element.querySelector('.dashboard-feedback [role="status"] span');

    add.passwordSaved.emit({ ...entries[0], id: 'another-new' });
    await fixture.whenStable();
    expect(element.querySelector('.dashboard-feedback [role="status"] span')).not.toBe(
      announcement,
    );
    expect(element.querySelector('.dashboard-feedback [role="status"]')?.textContent).toBe(
      'Password added',
    );

    add.passwordSaved.emit({ ...entries[0], siteName: 'https://edited.example.com' });
    await fixture.whenStable();
    expect(element.querySelector('.dashboard-feedback [role="status"]')?.textContent).toBe(
      'Password updated',
    );
    expect(document.activeElement).toBe(heading);

    (element.querySelector('[aria-label="Dismiss success message"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(element.querySelector('.dashboard-feedback [role="status"]')?.textContent).toBe('');
    expect(document.activeElement).toBe(heading);
  });

  it.each(['populated', 'empty'])(
    'restores focus after dismissing feedback with a %s list',
    async (state) => {
      const { fixture, element, add, detail, deletion } = await setup(
        state === 'empty' ? [entries[0]] : entries,
      );

      if (state === 'empty') {
        detail.deleteRequested.emit(entries[0]);
        deletion.next();
        deletion.complete();
      } else {
        add.passwordSaved.emit({ ...entries[0], id: 'new' });
      }
      await fixture.whenStable();

      const dismiss = element.querySelector<HTMLButtonElement>(
        '[aria-label="Dismiss success message"]',
      )!;
      dismiss.focus();
      expect(document.activeElement).toBe(dismiss);
      dismiss.click();
      await fixture.whenStable();

      expect(element.querySelector('[aria-label="Dismiss success message"]')).toBeNull();
      expect(element.querySelector('.dashboard-feedback [role="status"]')?.textContent).toBe('');
      expect(document.activeElement).toBe(
        element.querySelector(
          state === 'empty' ? '.dashboard-state button' : '.password-row__site',
        ),
      );
    },
  );

  it.each([0, 1, 2, 3])(
    'focuses next, previous, or empty action after deletion case %s',
    async (index) => {
      const records = index === 3 ? [entries[0]] : entries;
      const deleted = records[index === 3 ? 0 : index];
      const { fixture, element, deletion, detail } = await setup(records);
      (
        element.querySelectorAll('.password-row__site')[
          index === 3 ? 0 : index
        ] as HTMLButtonElement
      ).focus();

      detail.deleteRequested.emit(deleted);
      deletion.next();
      deletion.complete();
      await fixture.whenStable();
      expect(element.querySelector('.dashboard-feedback [role="status"]')?.textContent).toBe(
        'Password deleted',
      );

      const expected =
        index === 3
          ? element.querySelector('.dashboard-state button')
          : element.querySelector(
              '[data-entry-id="' +
                (index === 0 ? '1' : index === 1 ? '2' : '1') +
                '"] .password-row__site',
            );
      expect(document.activeElement).toBe(expected);
    },
  );

  it('guards pending deletes and keeps failure attached to its entry across unrelated saves', async () => {
    const { fixture, element, deletion, remove, add, detail } = await setup();
    vi.spyOn(detail, 'open').mockImplementation(() => {});

    (element.querySelectorAll('.password-row__site')[0] as HTMLButtonElement).click();

    detail.deleteRequested.emit(entries[0]);
    detail.deleteRequested.emit(entries[0]);
    expect(remove).toHaveBeenCalledOnce();

    deletion.error(new Error('Fixture'));
    await fixture.whenStable();
    expect(element.querySelector('.dashboard-feedback [role="status"]')?.textContent).toBe('');
    expect(detail.errorMessage()).toContain('Unable to delete');

    (element.querySelectorAll('.password-row__site')[1] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(detail.errorMessage()).toBeNull();

    add.passwordSaved.emit({ ...entries[2], id: 'new' });

    (element.querySelectorAll('.password-row__site')[0] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(detail.errorMessage()).toContain('Unable to delete');
  });

  it('does not close or focus away from an unrelated detail popup on delayed success', async () => {
    const { fixture, element, deletion, detail } = await setup();
    vi.spyOn(detail, 'isShowing').mockReturnValue(false);
    const close = vi.spyOn(detail, 'close').mockImplementation(() => {});

    detail.deleteRequested.emit(entries[0]);

    const other = element.querySelectorAll('.password-row__site')[1] as HTMLButtonElement;
    other.focus();
    deletion.next();
    deletion.complete();
    await fixture.whenStable();

    expect(close).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(other);
  });
});
