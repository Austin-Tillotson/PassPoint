import { Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faTableCellsLarge, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-navigation-links',
  imports: [FaIconComponent, RouterLink, RouterLinkActive],
  templateUrl: './navigation-links.html',
  styleUrl: './navigation-links.scss',
})
export class NavigationLinks {
  readonly linkSelected = output<void>();

  protected readonly faTableCellsLarge = faTableCellsLarge;
  protected readonly faWandMagicSparkles = faWandMagicSparkles;
}
