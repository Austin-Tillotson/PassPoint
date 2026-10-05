import { Component, ElementRef, computed, input, output, viewChild } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBars,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';


@Component({
  selector: 'app-header',
  imports: [FaIconComponent],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly navigationToggle = viewChild.required<ElementRef<HTMLButtonElement>>('navigationToggle');

  readonly isNavigationOpen = input(false);
  readonly navigationToggled = output<void>();
  
  readonly pageLabel = input('PassPoint');

  readonly username = input<string | null>(null);
  protected readonly userInitial = computed(
    () => this.username()?.charAt(0).toUpperCase() ?? '?',
  );

  protected readonly faBars = faBars;
  protected readonly faXmark = faXmark;


  public focusNavigationToggle(): void {
    this.navigationToggle().nativeElement.focus();
  }

  protected toggleNavigation(): void {
    this.navigationToggled.emit();
  }
}
