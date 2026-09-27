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
        useValue: { getAll: () => of([]) },
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
});
