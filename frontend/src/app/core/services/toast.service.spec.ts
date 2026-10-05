import { TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import { ToastService } from './toast.service';

describe('Toast lifecycle', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('stacks repeated messages and expires each independently', () => {
    vi.useFakeTimers();
    const service = TestBed.inject(ToastService);
    service.success('Password copied.');
    vi.advanceTimersByTime(1000);
    service.success('Password copied.');
    expect(service.toasts()).toHaveLength(2);
    expect(service.toasts()[0].id).not.toBe(service.toasts()[1].id);
    vi.advanceTimersByTime(4000);
    expect(service.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(service.toasts()).toEqual([]);
  });

  it('pauses, resumes and dismisses individual notifications', () => {
    vi.useFakeTimers();
    const service = TestBed.inject(ToastService);
    service.error('Unable to save.');
    const id = service.toasts()[0].id;
    service.pause(id);
    vi.advanceTimersByTime(10000);
    expect(service.toasts()).toHaveLength(1);
    service.resume(id);
    vi.advanceTimersByTime(4999);
    expect(service.toasts()).toHaveLength(1);
    service.dismiss(id);
    expect(service.toasts()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears timers when notifications are cleared or the service is destroyed', () => {
    vi.useFakeTimers();
    const service = TestBed.inject(ToastService);
    service.success('Saved');
    service.clear();
    expect(service.toasts()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    service.success('Saved again');
    TestBed.resetTestingModule();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('resumes paused notifications when their dialog closes', async () => {
    vi.useFakeTimers();
    const service = TestBed.inject(ToastService);
    const dialog = document.createElement('dialog');
    document.body.append(dialog);
    dialog.setAttribute('open', '');
    await Promise.resolve();
    service.success('Saved');
    service.pause(service.toasts()[0].id);
    dialog.remove();
    await Promise.resolve();
    vi.advanceTimersByTime(5000);
    expect(service.toasts()).toEqual([]);
  });
});
