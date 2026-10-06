import { SiteIcon } from '../../../../shared/components/site-icon/site-icon';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { PasswordEntry } from '../../models/password-entry';

@Component({
  selector: 'app-quick-favorites',
  imports: [SiteIcon, RouterLink, FaIconComponent],
  templateUrl: './quick-favorites.html',
  styleUrl: './quick-favorites.scss',
})
export class QuickFavorites {
  readonly entries = input.required<PasswordEntry[]>();
  readonly detailsRequested = output<PasswordEntry>();
  protected readonly faArrowRight = faArrowRight;

  protected siteLabel(site: string): string {
    try {
      return new URL(site).hostname.replace(/^www\./i, '');
    } catch {
      return site;
    }
  }
}
