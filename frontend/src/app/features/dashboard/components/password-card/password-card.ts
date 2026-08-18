import { Component, input, output } from '@angular/core';

import { Card } from '../../../../shared/components/card/card';

@Component({
  selector: 'app-password-card',
  imports: [Card],
  templateUrl: './password-card.html',
  styleUrl: './password-card.scss',
})
export class PasswordCard {
  readonly siteName = input.required<string>();
  readonly password = input.required<string>();

  readonly editRequested = output<void>();
  readonly deleteRequested = output<void>();
}