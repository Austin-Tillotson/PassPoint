import { Component, computed, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronRight, faGlobe } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-password-row',
  imports: [FaIconComponent],
  templateUrl: './password-row.html',
  styleUrl: './password-row.scss',
})
export class PasswordRow {
  readonly siteName = input.required<string>();

  readonly detailsRequested = output<void>();

  protected readonly failedFaviconUrl = signal<string | null>(null);
  protected readonly faGlobe = faGlobe;
  protected readonly faChevronRight = faChevronRight;

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

  protected handleFaviconError(): void {
    this.failedFaviconUrl.set(this.faviconUrl());
  }
}
