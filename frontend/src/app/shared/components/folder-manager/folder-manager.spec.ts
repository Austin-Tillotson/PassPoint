import { ToastService } from '../../../core/services/toast.service';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { FolderManager } from './folder-manager';
import { FolderStore } from '../../../core/services/folder-store';
import { Folder, FoldersService } from '../../../core/services/folders.service';

describe('Folder management', () => {
  async function setup() {
    const response = new Subject<Folder>();
    const deletion = new Subject<void>();
    const api = {
      create: vi.fn(() => response),
      update: vi.fn(() => response),
      delete: vi.fn(() => deletion),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), FolderStore, { provide: FoldersService, useValue: api }],
    });
    const store = TestBed.inject(FolderStore);
    store.folders.set([{ id: 'work', name: 'Work' }]);
    const fixture = TestBed.createComponent(FolderManager);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const dialog = element.querySelector('dialog')!;
    dialog.showModal = () => dialog.setAttribute('open', '');
    dialog.close = vi.fn();
    store.managerOpen.set(true);
    await fixture.whenStable();
    const click = async (selector: string) => {
      element.querySelector<HTMLButtonElement>(selector)!.click();
      await fixture.whenStable();
    };
    const submit = () =>
      element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    const fill = async (value: string) => {
      const input = element.querySelector('input')!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    return { store, fixture, element, response, deletion, api, click, submit, fill, dialog };
  }

  it('closes on backdrop clicks in every mode but ignores clicks inside the dialog', async () => {
    const { dialog, element, click } = await setup();
    const close = vi.spyOn(dialog, 'close').mockImplementation(() => {});

    element.querySelector<HTMLElement>('.folder-manager')!.click();
    expect(close).not.toHaveBeenCalled();

    dialog.click();
    expect(close).toHaveBeenCalledTimes(1);
    await click('.new-folder');
    dialog.click();
    expect(close).toHaveBeenCalledTimes(2);
    await click('footer button');
    await click('[aria-label="Rename Work"]');
    dialog.click();
    expect(close).toHaveBeenCalledTimes(3);
    await click('footer button');
    await click('[aria-label="Delete Work"]');
    dialog.click();
    expect(close).toHaveBeenCalledTimes(4);
  });

  it('rejects blank names and retains input on duplicate-name failure', async () => {
    const { fixture, element, api, response, click, submit, fill } = await setup();
    await click('.folder-manager > button');
    await fill('   ');
    submit();
    await fixture.whenStable();
    expect(api.create).not.toHaveBeenCalled();
    await fill('Work');
    submit();
    submit();
    expect(api.create).toHaveBeenCalledTimes(1);
    response.error({ status: 409 });
    await fixture.whenStable();
    expect(element.querySelector('input')!.value).toBe('Work');
    expect(element.textContent).toContain('already have a folder');
  });

  it('updates the folder name only after success and restores focus to the list action', async () => {
    const { store, fixture, element, response, click, submit, fill } = await setup();
    await click('[aria-label="Rename Work"]');
    expect(document.activeElement).toBe(element.querySelector('input'));
    await fill('Projects');
    submit();
    expect(store.folders()[0].name).toBe('Work');
    response.next({ id: 'work', name: 'Projects' });
    response.complete();
    await fixture.whenStable();
    expect(store.folders()[0].name).toBe('Projects');
    expect(document.activeElement).toBe(element.querySelector('.folder-manager > button'));
  });

  it('blocks dismissal while deleting and publishes deletion only on success', async () => {
    const { store, fixture, element, deletion, click, submit, dialog } = await setup();
    const deleted = vi.fn();
    store.folderDeleted.subscribe(deleted);
    await click('[aria-label="Delete Work"]');
    expect(element.textContent).toContain('No passwords will be deleted.');
    submit();
    const cancel = new Event('cancel', { cancelable: true });
    const close = vi.spyOn(dialog, 'close').mockImplementation(() => {});
    dialog.click();
    expect(close).not.toHaveBeenCalled();
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(store.folders()).toHaveLength(1);
    deletion.next();
    deletion.complete();
    await fixture.whenStable();
    expect(store.folders()).toEqual([]);
    expect(deleted).toHaveBeenCalledWith('work');
    expect(TestBed.inject(ToastService).toasts().at(-1)?.message).toContain('passwords are now Unfiled');
  });
});
