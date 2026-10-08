import { SiteIcon } from '../../../../shared/components/site-icon/site-icon';
import { parseSiteAddress, siteDisplayName } from '../../../../shared/utils/site-address';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ToastService } from '../../../../core/services/toast.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCopy, faFolder, faStar, faChevronRight, faGlobe } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-password-row',
  imports: [SiteIcon, FaIconComponent],
  templateUrl: './password-row.html',
  styleUrl: './password-row.scss',
})
export class PasswordRow {
  private readonly toasts = inject(ToastService);
  readonly siteName = input.required<string>();
  protected readonly siteUrl = computed(() => parseSiteAddress(this.siteName())?.href ?? null);
  readonly password = input('');
  readonly username = input<string | null>(null);
  readonly folderName = input('Unfiled');
  readonly folderColor = input('var(--color-text-muted)');
  protected readonly faFolder = faFolder;
  protected readonly faCopy = faCopy;
  protected readonly copying = signal(false);

  protected async copyPassword(): Promise<void> {
    if (this.copying()) return;
    this.copying.set(true);
    try {
      await navigator.clipboard.writeText(this.password());
      this.toasts.success('Password copied.');
    } catch {
      this.toasts.error('Unable to copy password. Please try again.');
    } finally {
      this.copying.set(false);
    }
  }
  readonly isFavorite = input(false);
  readonly favoritePending = input(false);
  readonly favoriteRequested = output<void>();
  protected readonly faStar = faStar;
  readonly grid = input(false);

  readonly detailsRequested = output<void>();

  protected readonly faGlobe = faGlobe;
  protected readonly faChevronRight = faChevronRight;

  protected readonly displayedSiteName = computed(() => siteDisplayName(this.siteName()));

}
