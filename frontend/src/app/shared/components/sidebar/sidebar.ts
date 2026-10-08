import { Component, inject, input } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';

import { LogoutButton } from '../logout-button/logout-button';
import { NavigationLinks } from '../navigation-links/navigation-links';

@Component({
  selector: 'app-sidebar',
  imports: [LogoutButton, NavigationLinks],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})

export class Sidebar {
  protected readonly themes = inject(ThemeService);
  readonly username = input<string | null>(null);
}
