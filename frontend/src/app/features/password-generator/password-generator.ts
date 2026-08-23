import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { Card } from '../../shared/components/card/card';

const LOWERCASE_LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SPECIAL_CHARACTERS = '!@#$%^&*()-_=+[]{};:,.?';

@Component({
  selector: 'app-password-generator',
  imports: [Card, ReactiveFormsModule],
  templateUrl: './password-generator.html',
  styleUrl: './password-generator.scss',
})
export class PasswordGenerator {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly generatorForm = new FormGroup({
    length: new FormControl(16, { nonNullable: true }),
    letters: new FormControl(true, { nonNullable: true }),
    numbers: new FormControl(true, { nonNullable: true }),
    specialCharacters: new FormControl(true, { nonNullable: true }),
    uppercase: new FormControl(true, { nonNullable: true }),
    lowercase: new FormControl(true, { nonNullable: true }),
  });

  protected readonly generatedPassword = signal<string | null>(null);

  constructor() {
    this.generatorForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateOptionAvailability());

    this.updateOptionAvailability();
  }

  protected generatePassword(): void {
    const {
      length,
      letters,
      numbers,
      specialCharacters,
      uppercase,
      lowercase,
    } = this.generatorForm.getRawValue();

    let characterPool = '';

    if (letters && lowercase) {
      characterPool += LOWERCASE_LETTERS;
    }

    if (letters && uppercase) {
      characterPool += UPPERCASE_LETTERS;
    }

    if (numbers) {
      characterPool += NUMBERS;
    }

    if (specialCharacters) {
      characterPool += SPECIAL_CHARACTERS;
    }

    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);

    const password = Array.from(
      randomValues,
      (value) => characterPool[value % characterPool.length],
    ).join('');

    this.generatedPassword.set(password);
  }

  private updateOptionAvailability(): void {
    const { letters, numbers, specialCharacters, uppercase, lowercase } =
      this.generatorForm.controls;

    this.updateMinimumSelection([letters, numbers, specialCharacters]);

    if (!letters.getRawValue()) {
      uppercase.disable({ emitEvent: false });
      lowercase.disable({ emitEvent: false });
      return;
    }

    this.updateMinimumSelection([uppercase, lowercase]);
  }

  private updateMinimumSelection(
    controls: FormControl<boolean>[],
  ): void {
    const selectedCount = controls.filter((control) =>
      control.getRawValue(),
    ).length;

    controls.forEach((control) => {
      const isOnlySelectedOption =
        selectedCount === 1 && control.getRawValue();

      if (isOnlySelectedOption) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    });
  }
}