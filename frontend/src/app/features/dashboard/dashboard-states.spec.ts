import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { AddPasswordDialog } from './components/add-password-dialog/add-password-dialog';
import { PasswordDetailDialog } from './components/password-detail-dialog/password-detail-dialog';
import { Dashboard } from './dashboard';
import { PasswordEntriesService } from './services/password-entries.service';
import type { PasswordEntry } from './models/password-entry';

describe('Dashboard request states', () => {
  let reportVisibility: (visible: boolean) => void;

  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          reportVisibility = (visible) =>
            callback(
              [{ isIntersecting: visible } as IntersectionObserverEntry],
              this as unknown as IntersectionObserver,
            );
        }
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function setup() {
    const request = new Subject<PasswordEntry[]>();
    const deletion = new Subject<void>();
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        {
          provide: PasswordEntriesService,
          useValue: { getAll: () => request, delete: () => deletion },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    return { request, deletion, fixture, element: fixture.nativeElement as HTMLElement };
  }
  it.each(['populated', 'empty', 'failure'])(
    'guards both Add actions until a successful load: %s',
    async (outcome) => {
      const { request, fixture, element } = await setup();
      const dialog = fixture.debugElement.query(By.directive(AddPasswordDialog))
        .componentInstance as AddPasswordDialog;
      const open = vi.spyOn(dialog, 'open').mockImplementation(() => {});
      reportVisibility(false);
      await fixture.whenStable();

      const buttons = () =>
        Array.from(
          element.querySelectorAll<HTMLButtonElement>(
            '.dashboard-heading__add:not([hidden]), .add-password-button, .dashboard-state button',
          ),
        );
      expect(buttons()).toHaveLength(2);
      for (const button of buttons()) {
        expect(button.disabled).toBe(true);
        button.click();
      }
      expect(open).not.toHaveBeenCalled();

      if (outcome === 'failure') {
        request.error(new Error('Fixture failure'));
      } else {
        request.next(
          outcome === 'empty'
            ? []
            : [
                {
                  id: '1',
                  siteName: 'https://alpha.example.com',
                  password: 'Sample',
                  createdAtUtc: '',
                },
              ],
        );
        request.complete();
      }
      await fixture.whenStable();

      for (const button of buttons()) {
        expect(button.disabled).toBe(outcome === 'failure');
        button.click();
      }
      expect(buttons()).toHaveLength(outcome === 'empty' ? 1 : 2);
      expect(open).toHaveBeenCalledTimes(outcome === 'failure' ? 0 : outcome === 'empty' ? 1 : 2);
    },
  );

  it('shows decorative placeholders and an outside status during a delayed request', async () => {
    const { request, fixture, element } = await setup();
    expect(element.querySelectorAll('.password-skeleton').length).toBe(3);
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Loading passwords');
    expect(element.querySelector('.password-list')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelector('.password-list [role="status"]')).toBeNull();
    request.next([
      { id: '1', siteName: 'https://alpha.example.com', password: 'Sample', createdAtUtc: '' },
    ]);
    request.complete();
    await fixture.whenStable();
    expect(element.querySelector('.password-skeleton')).toBeNull();
    expect(element.querySelector('.password-row__name')?.textContent).toContain(
      'alpha.example.com',
    );
    expect(element.querySelector('.password-list')?.getAttribute('aria-busy')).toBe('false');
  });
  it('clears loading on an empty successful response', async () => {
    const { request, fixture, element } = await setup();
    request.next([]);
    request.complete();
    await fixture.whenStable();
    expect(element.querySelector('.password-skeleton')).toBeNull();
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.textContent).toContain('No passwords yet');
    expect((element.querySelector('.dashboard-heading__add') as HTMLButtonElement).hidden).toBe(
      true,
    );
    expect(element.querySelector('.add-password-button')).toBeNull();
  });
  it('opens the existing form from the empty action and shows the first saved row', async () => {
    const { request, fixture, element } = await setup();
    request.next([]);
    request.complete();
    await fixture.whenStable();
    const dialog = fixture.debugElement.query(By.directive(AddPasswordDialog))
      .componentInstance as AddPasswordDialog;
    const open = vi.spyOn(dialog, 'open').mockImplementation(() => {});
    (element.querySelector('.dashboard-state button') as HTMLButtonElement).click();
    expect(open).toHaveBeenCalledOnce();
    dialog.passwordSaved.emit({
      id: '1',
      siteName: 'https://alpha.example.com',
      password: 'Sample',
      createdAtUtc: '',
    });
    await fixture.whenStable();
    expect(element.querySelector('.dashboard-state')).toBeNull();
    expect(element.querySelector('.password-row')).not.toBeNull();
  });
  it('focuses the empty Add action after deletion of the only entry', async () => {
    const { request, deletion, fixture, element } = await setup();
    const entry = {
      id: '1',
      siteName: 'https://alpha.example.com',
      password: 'Sample',
      createdAtUtc: '',
    };
    request.next([entry]);
    request.complete();
    await fixture.whenStable();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const details = fixture.debugElement.query(By.directive(PasswordDetailDialog))
      .componentInstance as PasswordDetailDialog;
    vi.spyOn(details, 'close').mockImplementation(() => {});
    details.deleteRequested.emit(entry);
    deletion.next();
    deletion.complete();
    await fixture.whenStable();
    expect(element.textContent).toContain('No passwords yet');
    expect(document.activeElement).toBe(element.querySelector('.dashboard-state button'));
    vi.restoreAllMocks();
  });
  it('clears loading on failure and displays only the load error', async () => {
    const { request, fixture, element } = await setup();
    request.error(new Error('Fixture failure'));
    await fixture.whenStable();
    expect(element.querySelector('.password-skeleton')).toBeNull();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Unable to load');
    expect(element.querySelector('app-password-detail-dialog [role="alert"]')).toBeNull();
  });
});
