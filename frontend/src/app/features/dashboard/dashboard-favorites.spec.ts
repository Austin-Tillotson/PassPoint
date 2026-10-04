import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { FolderStore } from '../../core/services/folder-store';
import { FoldersService } from '../../core/services/folders.service';
import { Dashboard } from './dashboard';
import { PasswordEntriesService } from './services/password-entries.service';

describe('Favorite controls', () => {
  async function setup() {
    const responses: Subject<{ id: string; isFavorite: boolean }>[] = [];
    const setFavorite = vi.fn(() => {
      const response = new Subject<{ id: string; isFavorite: boolean }>();
      responses.push(response);
      return response;
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        FolderStore,
        { provide: FoldersService, useValue: {} },
        {
          provide: PasswordEntriesService,
          useValue: {
            getAll: () =>
              of([
                {
                  id: '1',
                  siteName: 'https://example.com',
                  password: 'demo',
                  createdAtUtc: '',
                  folderId: 'work',
                  isFavorite: false,
                },
              ]),
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
      dialog.close = () => dialog.removeAttribute('open');
    }
    return { fixture, element, responses, setFavorite };
  }

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
    expect(element.textContent).toContain('Added to favorites');
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
    expect(element.querySelector('.password-row__error')?.textContent).toContain(
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
});
