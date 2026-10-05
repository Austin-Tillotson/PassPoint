import { FolderStore } from '../../../core/services/folder-store';
import { PasswordGeneratorState } from '../../../core/services/password-generator-state';
import { Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFolder, faFolderOpen, faPen, faRotateRight, faStar, faTableCellsLarge, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-navigation-links',
  imports: [FaIconComponent, RouterLink, RouterLinkActive],
  templateUrl: './navigation-links.html',
  styleUrl: './navigation-links.scss',
})
export class NavigationLinks {
  protected readonly generator = inject(PasswordGeneratorState);
  protected readonly folderStore = inject(FolderStore);
  protected readonly folderColors = this.folderStore.folderColors;
  protected readonly faStar = faStar;
  protected readonly faFolder = faFolder;
  protected readonly faPen = faPen;
  protected readonly faFolderOpen = faFolderOpen;
  protected readonly faRotateRight = faRotateRight;
  readonly linkSelected = output<void>();

  protected readonly faTableCellsLarge = faTableCellsLarge;
  protected readonly faWandMagicSparkles = faWandMagicSparkles;
}
