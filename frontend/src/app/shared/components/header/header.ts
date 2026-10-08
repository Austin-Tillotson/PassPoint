import { Component, ElementRef, computed, inject, input, output, viewChild } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';
import { ThemeToggle } from '../theme-toggle/theme-toggle';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBars,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';


@Component({
  selector: 'app-header',
  imports: [FaIconComponent, ThemeToggle],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  protected readonly themes = inject(ThemeService);
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
