import { Component, computed, input, output, signal } from '@angular/core';

import { Card } from '../../../../shared/components/card/card';

const MASKED_PASSWORD = '********';

@Component({
  selector: 'app-password-card',
  imports: [Card],
  templateUrl: './password-card.html',
  styleUrl: './password-card.scss',
})
export class PasswordCard {
  readonly siteName = input.required<string>();
  readonly password = input.required<string>();

  readonly editRequested = output<void>();
  readonly deleteRequested = output<void>();

  protected readonly isPasswordVisible = signal(false);

  protected readonly displayedPassword = computed(() =>
    this.isPasswordVisible() ? this.password() : MASKED_PASSWORD,
  );

  protected readonly displayedSiteName = computed(() =>
    this.siteName().replace(/^https?:\/\//i, ''),
  );

  protected togglePasswordVisibility(): void {
    this.isPasswordVisible.update((isVisible) => !isVisible);
  }
}