import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { AddPasswordDialog } from './components/add-password-dialog/add-password-dialog';
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
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [{ provide: PasswordEntriesService, useValue: { getAll: () => request } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    return { request, fixture, element: fixture.nativeElement as HTMLElement };
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
            '.dashboard-heading__add, .add-password-button',
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
      expect(open).toHaveBeenCalledTimes(outcome === 'failure' ? 0 : 2);
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
