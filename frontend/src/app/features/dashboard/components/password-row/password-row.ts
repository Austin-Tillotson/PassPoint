import { Component, computed, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCopy, faFolder, faStar, faChevronRight, faGlobe } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-password-row',
  imports: [FaIconComponent],
  templateUrl: './password-row.html',
  styleUrl: './password-row.scss',
})
export class PasswordRow {
  readonly siteName = input.required<string>();
  protected readonly siteUrl = computed(() => {
    try {
      const url = new URL(this.siteName());
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  });
  readonly password = input('');
  readonly folderName = input('Unfiled');
  readonly folderColor = input('var(--color-text-muted)');
  protected readonly faFolder = faFolder;
  protected readonly faCopy = faCopy;
  protected readonly copying = signal(false);
  protected readonly copyMessage = signal('');
  protected readonly copyError = signal('');

  protected async copyPassword(): Promise<void> {
    if (this.copying()) return;
    this.copying.set(true);
    this.copyMessage.set('');
    this.copyError.set('');
    try {
      await navigator.clipboard.writeText(this.password());
      this.copyMessage.set('Password copied.');
    } catch {
      this.copyError.set('Unable to copy password. Please try again.');
    } finally {
      this.copying.set(false);
    }
  }
  readonly isFavorite = input(false);
  readonly favoritePending = input(false);
  readonly favoriteError = input('');
  readonly favoriteRequested = output<void>();
  protected readonly faStar = faStar;
  readonly grid = input(false);

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
