import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-logout-button',
  imports: [FaIconComponent],
  templateUrl: './logout-button.html',
  styleUrl: './logout-button.scss',
})

export class LogoutButton {
  readonly username = input<string | null>(null);
  protected readonly userInitial = computed(() => this.username()?.charAt(0).toUpperCase() || '?');
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly faRightFromBracket = faRightFromBracket;
  protected readonly isLoggingOut = signal(false);

  protected logout(): void {
    if (this.isLoggingOut()) {
      return;
    }

    this.isLoggingOut.set(true);

    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.isLoggingOut.set(false),
    });
  }
}
