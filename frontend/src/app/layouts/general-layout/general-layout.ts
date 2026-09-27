import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';

import { Header } from '../../shared/components/header/header';
import { MobileNavigation } from '../../shared/components/mobile-navigation/mobile-navigation';
import { Sidebar } from '../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-general-layout',
  imports: [Header, MobileNavigation, RouterOutlet, Sidebar],
  templateUrl: './general-layout.html',
  styleUrl: './general-layout.scss',
})
export class GeneralLayout {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly isMobileNavigationOpen = signal(false);
  protected readonly pageLabel = signal('PassPoint');

  constructor() {
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
