import { Component, input } from '@angular/core';

import { LogoutButton } from '../logout-button/logout-button';
import { NavigationLinks } from '../navigation-links/navigation-links';

@Component({
  selector: 'app-mobile-navigation',
  imports: [LogoutButton, NavigationLinks],
  templateUrl: './mobile-navigation.html',
  styleUrl: './mobile-navigation.scss',
})

export class MobileNavigation {
  readonly isOpen = input(false);
}