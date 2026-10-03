import { FoldersService } from '../../core/services/folders.service';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { GeneralLayout } from './general-layout';

@Component({ template: '' })
class TestPage {}

describe('GeneralLayout mobile navigation', () => {
  let fixture: ComponentFixture<GeneralLayout>;
  let toggle: HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneralLayout],
      providers: [{ provide: FoldersService, useValue: { getAll: () => of([]) } },
        provideRouter([
          { path: 'dashboard', component: TestPage },
          { path: 'password-generator', component: TestPage },
        ]),
        {
          provide: AuthService,
          useValue: { getCurrentUser: () => of({ username: 'Preview user' }) },
        },
      ],
    }).compileComponents();

    await TestBed.inject(Router).navigateByUrl('/dashboard');
    fixture = TestBed.createComponent(GeneralLayout);
    await fixture.whenStable();
    toggle = fixture.nativeElement.querySelector('.toggle-button');
    toggle.click();
    await fixture.whenStable();
  });

  it('closes with Escape and restores focus to the toggle', async () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.mobile-navigation a');
    link.focus();
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });

  it('closes when the current page is selected', async () => {
    fixture.nativeElement.querySelector('.mobile-navigation a[href="/dashboard"]').click();
    await fixture.whenStable();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });

  it('closes and updates the current link when navigating to another page', async () => {
    fixture.nativeElement.querySelector('.mobile-navigation a[href="/password-generator"]').click();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/password-generator');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('.mobile-navigation [aria-current="page"]').textContent)
      .toContain('Password Generator');
  });
});
