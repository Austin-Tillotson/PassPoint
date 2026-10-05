import { ToastService } from '../../core/services/toast.service';
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

  it('stacks add and edit confirmations without moving focus', async () => {
    const { fixture, element, add } = await setup();
    const heading = element.querySelector<HTMLButtonElement>('.dashboard-heading__add')!;
    heading.focus();
    add.passwordSaved.emit({ ...entries[0], id: 'new' });
    add.passwordSaved.emit({ ...entries[0], id: 'another-new' });
    add.passwordSaved.emit({ ...entries[0], siteName: 'https://edited.example.com' });
    await fixture.whenStable();
    expect(TestBed.inject(ToastService).toasts().map(toast => toast.message)).toEqual([
      'Password added', 'Password added', 'Password updated',
    ]);
    expect(document.activeElement).toBe(heading);
  });
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
      expect((TestBed.inject(ToastService).toasts().at(-1)?.message ?? '')).toBe(
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

  it('guards pending deletes and reports failures through a toast', async () => {
    const { fixture, deletion, remove, detail } = await setup();
    detail.deleteRequested.emit(entries[0]);
    detail.deleteRequested.emit(entries[0]);
    expect(remove).toHaveBeenCalledOnce();
    deletion.error(new Error('Fixture'));
    await fixture.whenStable();
    expect(TestBed.inject(ToastService).toasts().at(-1)).toMatchObject({
      kind: 'error', message: 'Unable to delete the password entry. Please try again.',
    });
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
