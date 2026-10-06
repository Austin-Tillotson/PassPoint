import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFolder, faStar, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink, RouterOutlet, FaIconComponent],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
})

export class AuthLayout {
  protected readonly faFolder = faFolder;
  protected readonly faStar = faStar;
  protected readonly faWandMagicSparkles = faWandMagicSparkles;
}
