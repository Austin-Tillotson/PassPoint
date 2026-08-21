import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBars,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  imports: [FaIconComponent],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit {
  private readonly authService = inject(AuthService);

  readonly isNavigationOpen = input(false);
  readonly navigationToggled = output<void>();

  protected readonly username = signal<string | null>(null);
  protected readonly userInitial = computed(
    () => this.username()?.charAt(0).toUpperCase() ?? '?',
  );

  protected readonly faBars = faBars;
  protected readonly faMagnifyingGlass = faMagnifyingGlass;

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => this.username.set(user.username),
    });
  }

  protected toggleNavigation(): void {
    this.navigationToggled.emit();
  }
}