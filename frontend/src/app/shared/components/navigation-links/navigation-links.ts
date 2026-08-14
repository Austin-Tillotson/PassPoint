import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navigation-links',
  imports: [RouterLink],
  templateUrl: './navigation-links.html',
  styleUrl: './navigation-links.scss',
})
export class NavigationLinks {}