import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AddPasswordDialog } from './components/add-password-dialog/add-password-dialog';
import { Dashboard } from './dashboard';
import { PasswordEntriesService } from './services/password-entries.service';

describe('Dashboard Add password actions', () => {
  let fixture: ComponentFixture<Dashboard>;
  let reportVisibility: (visible: boolean) => void;
  const observe = vi.fn();
  const disconnect = vi.fn();

  beforeEach(async () => {
    observe.mockClear();
    disconnect.mockClear();
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) {
        reportVisibility = (visible) => callback(
          [{ isIntersecting: visible } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
      observe = observe;
      disconnect = disconnect;
    });

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [{
        provide: PasswordEntriesService,
        useValue: { getAll: () => of([{ id: 'existing', siteName: 'https://existing.example.com', password: 'Sample', createdAtUtc: '' }]) },
      }],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
  });

  it('only renders the floating action while the heading action is outside the viewport', async () => {
    expect(observe).toHaveBeenCalledWith(fixture.nativeElement.querySelector('.dashboard-heading__add'));
    expect(fixture.nativeElement.querySelector('.add-password-button')).toBeNull();

    reportVisibility(false);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.add-password-button')).not.toBeNull();

    reportVisibility(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.add-password-button')).toBeNull();
  });

  it('opens the same add dialog from either action', async () => {
    const dialog = fixture.debugElement.query(By.directive(AddPasswordDialog)).componentInstance;
    const open = vi.spyOn(dialog, 'open').mockImplementation(() => {});

    fixture.nativeElement.querySelector('.dashboard-heading__add').click();
    reportVisibility(false);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.add-password-button').click();

    expect(open).toHaveBeenCalledTimes(2);
    expect(open.mock.calls).toEqual([[], []]);
  });

  it('disconnects the observer when leaving the dashboard', () => {
    fixture.destroy();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('adds saved entries in name order and replaces an edited entry without duplication', async () => {
    const dialog = fixture.debugElement.query(By.directive(AddPasswordDialog)).componentInstance as AddPasswordDialog;
    const entry = { id: '1', siteName: 'https://zebra.example.com', password: 'Sample-only', createdAtUtc: '2026-09-25T12:00:00Z' };
    dialog.passwordSaved.emit(entry);
    dialog.passwordSaved.emit({ ...entry, id: '2', siteName: 'https://alpha.example.com' });
    await fixture.whenStable();
    const names = () => [...fixture.nativeElement.querySelectorAll('.password-row__name')].map((element: any) => element.textContent.trim());
    expect(names()).toEqual(['alpha.example.com', 'existing.example.com', 'zebra.example.com']);
    dialog.passwordSaved.emit({ ...entry, siteName: 'https://beta.example.com' });
    await fixture.whenStable();
    expect(names()).toEqual(['alpha.example.com', 'beta.example.com', 'existing.example.com']);
  });
});
