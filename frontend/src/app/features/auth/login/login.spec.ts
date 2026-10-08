import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../../core/services/auth.service';
import { Login } from './login';

describe('Login demo session', () => {
  async function setup() {
    const response = new Subject<void>();
    const auth = { startDemo: vi.fn(() => response), login: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector(
      '.auth-page__demo button',
    ) as HTMLButtonElement;
    return { fixture, response, auth, navigate, button };
  }

  it('creates a private session without shared credentials and prevents duplicate clicks', async () => {
    const { fixture, response, auth, navigate, button } = await setup();
    button.click();
    button.click();
    await fixture.whenStable();
    expect(auth.startDemo).toHaveBeenCalledTimes(1);
    expect(auth.login).not.toHaveBeenCalled();
    expect(button.disabled).toBe(true);
    response.next();
    response.complete();
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(button.disabled).toBe(false);
  });

  it('explains throttling and allows retry after a failed start', async () => {
    const { fixture, response, navigate, button } = await setup();
    button.click();
    response.error(new HttpErrorResponse({ status: 429 }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'demo is busy',
    );
    expect(button.disabled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});
