import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-floating-input',
  templateUrl: './floating-input.html',
  styleUrl: './floating-input.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FloatingInput),
      multi: true,
    },
  ],
})
export class FloatingInput implements ControlValueAccessor {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly type = input('text');
  readonly autocomplete = input('');
  readonly placeholder = input('');
  readonly fillOnTab = input<string | null>(null);
  readonly invalid = input(false);

  protected readonly value = signal('');
  protected readonly isDisabled = signal(false);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(onChange: (value: string) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.updateValue(input.value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const fillValue = this.fillOnTab();

    if (
      event.key === 'Tab' &&
      !event.shiftKey &&
      this.value() === '' &&
      fillValue
    ) {
      event.preventDefault();
      this.updateValue(fillValue);
    }
  }

  protected onBlur(): void {
    this.onTouched();
  }

  private updateValue(value: string): void {
    this.value.set(value);
    this.onChange(value);
  }
}