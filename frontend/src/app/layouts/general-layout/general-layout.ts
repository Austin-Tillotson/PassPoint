import { FolderManager } from '../../shared/components/folder-manager/folder-manager';
import { PasswordGenerator } from '../../features/password-generator/password-generator';
import { FolderStore } from '../../core/services/folder-store';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, finalize } from 'rxjs';

import { Header } from '../../shared/components/header/header';
import { MobileNavigation } from '../../shared/components/mobile-navigation/mobile-navigation';
import { Sidebar } from '../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-general-layout',
  providers: [FolderStore],
  imports: [PasswordGenerator, FolderManager, Header, MobileNavigation, RouterOutlet, Sidebar],
  templateUrl: './general-layout.html',
  styleUrl: './general-layout.scss',
})
export class GeneralLayout {
  protected readonly username = signal<string | null>(null);
  protected readonly isDemo = signal(false);
  protected readonly resettingDemo = signal(false);
  private readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastService);
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly isMobileNavigationOpen = signal(false);
  protected readonly pageLabel = signal('PassPoint');

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.expiryTimer));
    this.auth
      .getCurrentUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.username.set(user.username);
          this.isDemo.set(!!user.isDemo);
          if (user.isDemo && user.demoExpiresAtUtc) {
            const delay = Date.parse(user.demoExpiresAtUtc) - Date.now();
            if (Number.isFinite(delay))
              this.expiryTimer = setTimeout(
                () => {
                  this.toasts.clear();
                  this.toasts.error(
                    'Your demo session has ended. Start a new demo to explore again.',
                  );
                  void this.router.navigateByUrl('/login');
                },
                Math.max(0, delay),
              );
          }
        },
        error: () => this.username.set(null),
      });
    inject(FolderStore).load();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.isMobileNavigationOpen.set(false);
        this.updatePageLabel();
      });

    this.updatePageLabel();
  }

  protected resetDemo(): void {
    if (
      !this.isDemo() ||
      this.resettingDemo() ||
      !window.confirm(
        'Reset your demo workspace? Your demo changes will be replaced with the sample data.',
      )
    )
      return;
    this.resettingDemo.set(true);
    this.auth
      .resetDemo()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.resettingDemo.set(false)),
      )
      .subscribe({
        // Reinitialize collections, folder counts and any open dialogs together.
        next: () => window.location.assign('/dashboard'),
        error: () => this.toasts.error('Unable to reset the demo. Please try again.'),
      });
  }

  protected toggleMobileNavigation(): void {
    this.isMobileNavigationOpen.update((isOpen) => !isOpen);
  }

  protected closeMobileNavigation(header: Header): void {
    if (!this.isMobileNavigationOpen()) {
      return;
    }

    this.isMobileNavigationOpen.set(false);
    header.focusNavigationToggle();
  }

  private updatePageLabel(): void {
    let activeRoute = this.router.routerState.snapshot.root;

    while (activeRoute.firstChild) {
      activeRoute = activeRoute.firstChild;
    }

    this.pageLabel.set(activeRoute.data['pageLabel'] ?? 'PassPoint');
  }
}
