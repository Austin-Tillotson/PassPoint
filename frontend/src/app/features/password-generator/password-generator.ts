import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-password-generator',
  templateUrl: './password-generator.html',
  styleUrl: './password-generator.scss',
})
export class PasswordGenerator {
  protected readonly randomNumber = signal<number | null>(null);

  protected generateRandomNumber(): void {
    this.randomNumber.set(Math.floor(Math.random() * 1_000_000));
  }
}