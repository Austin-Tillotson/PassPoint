import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faChartPie,
  faGear,
  faKey,
  faUser,
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-navigation-links',
  imports: [FaIconComponent, RouterLink, RouterLinkActive],
  templateUrl: './navigation-links.html',
  styleUrl: './navigation-links.scss',
})
export class NavigationLinks {
  protected readonly faChartPie = faChartPie;
  protected readonly faGear = faGear;
  protected readonly faKey = faKey;
  protected readonly faUser = faUser;
}