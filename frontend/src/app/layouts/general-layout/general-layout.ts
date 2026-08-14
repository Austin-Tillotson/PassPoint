import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

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
  protected readonly isMobileNavigationOpen = signal(false);

  protected toggleMobileNavigation(): void {
    this.isMobileNavigationOpen.update((isOpen) => !isOpen);
  }
}