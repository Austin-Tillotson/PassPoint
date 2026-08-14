import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.scss',
})

export class Header {
  readonly isNavigationOpen = input(false);
  readonly navigationToggled = output<void>();

  protected toggleNavigation(): void {
    this.navigationToggled.emit();
  }
}