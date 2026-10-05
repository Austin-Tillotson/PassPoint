import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PasswordGeneratorState {
  readonly open = signal(false);
}
