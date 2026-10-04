import { By } from '@angular/platform-browser';
import { AddPasswordDialog } from './components/add-password-dialog/add-password-dialog';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { FolderStore } from '../../core/services/folder-store';
import { Folder, FoldersService } from '../../core/services/folders.service';
import { Dashboard } from './dashboard';
import { PasswordEntriesService } from './services/password-entries.service';

@Component({ template: '' })
class TestPage {}

describe('Folder collections', () => {
  async function setup() {
    const folderRequest = new Subject<Folder[]>();
    const getAll = vi.fn(() =>
      of([
        {
          id: '1',
          siteName: 'https://work.example',
          password: 'demo',
          createdAtUtc: '',
          folderId: 'work',
        },
        {
          id: '2',
          siteName: 'https://other.example',
          password: 'demo',
          createdAtUtc: '',
          folderId: null,
        },
      ]),
    );
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'dashboard', component: TestPage }]),
        FolderStore,
        { provide: FoldersService, useValue: { getAll: () => folderRequest } },
        { provide: PasswordEntriesService, useValue: { getAll } },
      ],
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');
    const store = TestBed.inject(FolderStore);
    store.load();
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    return { store, router, fixture, folderRequest, getAll };
  }

  it('filters collections without reloading passwords and resets search on selection changes', async () => {
    const { store, router, fixture, folderRequest, getAll } = await setup();
    folderRequest.next([
      { id: 'work', name: 'Work' },
      { id: 'empty', name: 'Empty' },
    ]);
    folderRequest.complete();
    await router.navigateByUrl('/dashboard?folder=work');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.collection-heading').textContent).toContain(
      'Work',
    );
    expect(fixture.nativeElement.querySelectorAll('[data-entry-id]').length).toBe(1);
    const search = fixture.nativeElement.querySelector('input[type=search]');
    search.value = 'absent';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No matching passwords');
    expect(store.passwordCounts()).toEqual({ work: 1, unfiled: 1 });
    await router.navigateByUrl('/dashboard?collection=unfiled');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('input[type=search]').value).toBe('');
    expect(fixture.nativeElement.querySelector('.password-row__name').textContent).toContain(
      'other.example',
    );
    await router.navigateByUrl('/dashboard?folder=empty');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No passwords in this folder');
    expect(store.label()).toBe('Empty');
    expect(getAll).toHaveBeenCalledTimes(1);
  });

  it('updates folder counts after passwords are added, moved, or removed', async () => {
    const { store, fixture } = await setup();
    const entries = fixture.componentInstance['passwordEntries'];
    entries.set([
      { id: '1', siteName: 'work.example', password: 'demo', createdAtUtc: '', folderId: 'personal' },
      { id: '3', siteName: 'personal.example', password: 'demo', createdAtUtc: '', folderId: 'personal' },
    ]);
    await fixture.whenStable();
    expect(store.passwordCounts()).toEqual({ personal: 2 });

    entries.set([]);
    await fixture.whenStable();
    expect(store.passwordCounts()).toEqual({});
  });

  it('only falls back from a missing folder after a successful folder load', async () => {
    const { store, router, fixture, folderRequest } = await setup();
    await router.navigateByUrl('/dashboard?folder=missing');
    expect(store.selection()).toBe('missing');
    folderRequest.error(new Error('offline'));
    await fixture.whenStable();
    expect(router.url).toBe('/dashboard?folder=missing');
    expect(store.error()).toBeTruthy();
  });

  it('redirects unknown folder links after loading succeeds', async () => {
    const { router, fixture, folderRequest } = await setup();
    await router.navigateByUrl('/dashboard?folder=missing');
    folderRequest.next([]);
    folderRequest.complete();
    await fixture.whenStable();
    expect(router.url).toBe('/dashboard');
  });

  it('removes a moved entry from the active folder and reports why it disappeared', async () => {
    const { router, fixture, folderRequest } = await setup();
    folderRequest.next([{ id: 'work', name: 'Work' }]);
    folderRequest.complete();
    await router.navigateByUrl('/dashboard?folder=work');
    await fixture.whenStable();
    const add = fixture.debugElement.query(By.directive(AddPasswordDialog))
      .componentInstance as AddPasswordDialog;
    add.passwordSaved.emit({
      id: '1',
      siteName: 'https://work.example',
      password: 'demo',
      createdAtUtc: '',
      folderId: null,
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('[data-entry-id]').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('different collection');
    await router.navigateByUrl('/dashboard?collection=unfiled');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('[data-entry-id]').length).toBe(2);
  });

  it('deleting the selected folder returns to All passwords and keeps its entries', async () => {
    const { store, router, fixture, folderRequest } = await setup();
    folderRequest.next([{ id: 'work', name: 'Work' }]);
    folderRequest.complete();
    await router.navigateByUrl('/dashboard?folder=work');
    await fixture.whenStable();
    store.removeFolder('work');
    await fixture.whenStable();
    expect(router.url).toBe('/dashboard');
    expect(fixture.nativeElement.querySelectorAll('[data-entry-id]').length).toBe(2);
    await router.navigateByUrl('/dashboard?collection=unfiled');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('[data-entry-id]').length).toBe(2);
  });
});
