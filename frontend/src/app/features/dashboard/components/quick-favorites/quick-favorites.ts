import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowRight, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { PasswordEntry } from '../../models/password-entry';

@Component({
  selector: 'app-quick-favorites',
  imports: [RouterLink, FaIconComponent],
  templateUrl: './quick-favorites.html',
  styleUrl: './quick-favorites.scss',
})
export class QuickFavorites {
  readonly entries = input.required<PasswordEntry[]>();
  readonly detailsRequested = output<PasswordEntry>();
  protected readonly faGlobe = faGlobe;
  protected readonly faArrowRight = faArrowRight;

  protected siteLabel(site: string): string {
    try {
      return new URL(site).hostname.replace(/^www\./i, '');
    } catch {
      return site;
    }
  }
}
