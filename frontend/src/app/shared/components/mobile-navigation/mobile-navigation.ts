import { Component, input, output } from '@angular/core';

import { LogoutButton } from '../logout-button/logout-button';
import { NavigationLinks } from '../navigation-links/navigation-links';

@Component({
  selector: 'app-mobile-navigation',
  imports: [LogoutButton, NavigationLinks],
  templateUrl: './mobile-navigation.html',
  styleUrl: './mobile-navigation.scss',
})

export class MobileNavigation {
  readonly username = input<string | null>(null);
  readonly isOpen = input(false);
  readonly navigationClosed = output<void>();
}
