import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { FloatingInput } from '../floating-input/floating-input';

@Component({
  selector: 'app-header',
  imports: [FloatingInput, ReactiveFormsModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit {
  private readonly authService = inject(AuthService);

  readonly isNavigationOpen = input(false);
  readonly navigationToggled = output<void>();

  protected readonly searchControl = new FormControl('', {
    nonNullable: true,
  });

  protected readonly username = signal<string | null>(null);
  protected readonly userInitial = computed(
    () => this.username()?.charAt(0).toUpperCase() ?? '?',
  );

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => this.username.set(user.username),
    });
  }

  protected toggleNavigation(): void {
    this.navigationToggled.emit();
  }
}