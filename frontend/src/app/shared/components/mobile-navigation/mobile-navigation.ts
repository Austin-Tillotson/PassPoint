import { Component, input } from '@angular/core';

import { NavigationLinks } from '../navigation-links/navigation-links';

@Component({
  selector: 'app-mobile-navigation',
  imports: [NavigationLinks],
  templateUrl: './mobile-navigation.html',
  styleUrl: './mobile-navigation.scss',
})

export class MobileNavigation {
  readonly isOpen = input(false);
}