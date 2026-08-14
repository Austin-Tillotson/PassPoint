import { Component } from '@angular/core';

import { NavigationLinks } from '../navigation-links/navigation-links';

@Component({
  selector: 'app-sidebar',
  imports: [NavigationLinks],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})

export class Sidebar {}