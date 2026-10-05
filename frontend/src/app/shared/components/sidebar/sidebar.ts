import { Component, input } from '@angular/core';

import { LogoutButton } from '../logout-button/logout-button';
import { NavigationLinks } from '../navigation-links/navigation-links';

@Component({
  selector: 'app-sidebar',
  imports: [LogoutButton, NavigationLinks],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})

export class Sidebar {
  readonly username = input<string | null>(null);
}
