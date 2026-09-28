import { Component, computed, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faGlobe } from '@fortawesome/free-solid-svg-icons';


const MASKED_PASSWORD = '********';

@Component({
  selector: 'app-password-row',
  imports: [FaIconComponent],
  templateUrl: './password-row.html',
  styleUrl: './password-row.scss',
})
export class PasswordRow {
  readonly siteName = input.required<string>();
  readonly password = input.required<string>();

  readonly editRequested = output<void>();
  readonly deleteRequested = output<void>();

  protected readonly isPasswordVisible = signal(false);
  protected readonly failedFaviconUrl = signal<string | null>(null);
  protected readonly faGlobe = faGlobe;

  protected readonly displayedPassword = computed(() =>
    this.isPasswordVisible() ? this.password() : MASKED_PASSWORD,
  );

  protected readonly displayedSiteName = computed(() =>
    this.siteName()
      .replace(/^https?:\/\/(?:www\.)?/i, '')
      .replace(/[^a-z]+$/i, ''),
  );

  protected readonly faviconUrl = computed(() => {
    try {
      return `${new URL(this.siteName()).origin}/favicon.ico`;
    } catch {
      return '';
    }
  });

  protected readonly shouldShowFavicon = computed(() => {
    const faviconUrl = this.faviconUrl();

    return faviconUrl !== '' && this.failedFaviconUrl() !== faviconUrl;
  });

  protected togglePasswordVisibility(): void {
    this.isPasswordVisible.update((isVisible) => !isVisible);
  }

  protected handleFaviconError(): void {
    this.failedFaviconUrl.set(this.faviconUrl());
  }
}
