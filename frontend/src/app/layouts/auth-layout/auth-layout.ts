import { Component, inject } from '@angular/core';
import { ThemeService } from '../../core/services/theme.service';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { RouterLink, RouterOutlet } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFolder, faStar, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink, RouterOutlet, FaIconComponent, ThemeToggle],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
})

export class AuthLayout {
  protected readonly themes = inject(ThemeService);
  protected readonly faFolder = faFolder;
  protected readonly faStar = faStar;
  protected readonly faWandMagicSparkles = faWandMagicSparkles;
}
