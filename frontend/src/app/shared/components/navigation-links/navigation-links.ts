import { FolderStore } from '../../../core/services/folder-store';
import { Component, computed, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFolder, faFolderOpen, faRotateRight, faTableCellsLarge, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-navigation-links',
  imports: [FaIconComponent, RouterLink, RouterLinkActive],
  templateUrl: './navigation-links.html',
  styleUrl: './navigation-links.scss',
})
export class NavigationLinks {
  protected readonly folderStore = inject(FolderStore);
  protected readonly folderColors = computed(() => {
    const palette = ['#b57850', '#628568', '#8276ac', '#4c849d', '#ad6585', '#95802e'];
    const folders = [...this.folderStore.folders()].sort((a, b) => a.id.localeCompare(b.id));
    return Object.fromEntries(folders.map((folder, index) => [folder.id, palette[index % palette.length]]));
  });
  protected readonly faFolder = faFolder;
  protected readonly faFolderOpen = faFolderOpen;
  protected readonly faRotateRight = faRotateRight;
  readonly linkSelected = output<void>();

  protected readonly faTableCellsLarge = faTableCellsLarge;
  protected readonly faWandMagicSparkles = faWandMagicSparkles;
}
