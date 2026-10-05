import { Component, DestroyRef, ElementRef, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCopy, faRotateRight, faXmark } from '@fortawesome/free-solid-svg-icons';
import { PasswordGeneratorState } from '../../core/services/password-generator-state';
import { ToastService } from '../../core/services/toast.service';
import { ToastOutlet } from '../../shared/components/toast-outlet/toast-outlet';

const LOWERCASE_LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SPECIAL_CHARACTERS = '!@#$%^&*()-_=+[]{};:,.?';

@Component({
  selector: 'app-password-generator',
  imports: [FaIconComponent, ReactiveFormsModule, ToastOutlet],
  templateUrl: './password-generator.html',
  styleUrl: './password-generator.scss',
})
export class PasswordGenerator {
  private readonly destroyRef = inject(DestroyRef);
  private readonly state = inject(PasswordGeneratorState);
  private readonly toasts = inject(ToastService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private returnTarget: HTMLElement | null = null;
  private copyVersion = 0;
  protected readonly copying = signal(false);
  protected readonly faCopy = faCopy;
  protected readonly faRotateRight = faRotateRight;
  protected readonly faXmark = faXmark;

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
      .subscribe(() => {
        this.updateOptionAvailability();
        this.generatePassword();
      });

    this.updateOptionAvailability();
    effect(() => {
      if (!this.state.open()) return;
      untracked(() => {
        this.returnTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        this.generatePassword();
        this.dialog().nativeElement.showModal();
      });
    });
    this.destroyRef.onDestroy(() => {
      this.copyVersion++;
      this.state.open.set(false);
    });
  }

  protected close(): void {
    this.dialog().nativeElement.close();
    this.onClosed();
  }

  protected onClosed(): void {
    if (!this.state.open()) return;
    this.state.open.set(false);
    this.generatedPassword.set(null);
    this.copyVersion++;
    this.copying.set(false);
    this.returnTarget?.focus();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected async copyPassword(): Promise<void> {
    const password = this.generatedPassword();
    if (!password || this.copying()) return;
    const version = ++this.copyVersion;
    this.copying.set(true);
    try {
      await navigator.clipboard.writeText(password);
      if (version === this.copyVersion) this.toasts.success('Password copied.');
    } catch {
      if (version === this.copyVersion) this.toasts.error('Unable to copy password. Please try again.');
    } finally {
      if (version === this.copyVersion) this.copying.set(false);
    }
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
