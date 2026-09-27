import { Component, ElementRef, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBars,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  imports: [FaIconComponent],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly navigationToggle = viewChild.required<ElementRef<HTMLButtonElement>>('navigationToggle');

  readonly isNavigationOpen = input(false);
  readonly navigationToggled = output<void>();
  
  readonly pageLabel = input('PassPoint');

  protected readonly username = signal<string | null>(null);
  protected readonly userInitial = computed(
    () => this.username()?.charAt(0).toUpperCase() ?? '?',
  );

  protected readonly faBars = faBars;
  protected readonly faXmark = faXmark;

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => this.username.set(user.username),
    });
  }

  public focusNavigationToggle(): void {
    this.navigationToggle().nativeElement.focus();
  }

  protected toggleNavigation(): void {
    this.navigationToggled.emit();
  }
}
