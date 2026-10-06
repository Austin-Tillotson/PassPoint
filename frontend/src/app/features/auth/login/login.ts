import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  AuthCredentials,
  AuthService,
} from '../../../core/services/auth.service';
import { FloatingInput } from '../../../shared/components/floating-input/floating-input';

const DEMO_CREDENTIALS: AuthCredentials = {
  username: 'Demo',
  password: 'Password123',
};

@Component({
  selector: 'app-login',
  imports: [FloatingInput, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})

export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);

  protected readonly loginForm = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected onSubmit(): void {
  if (this.loginForm.invalid) {
    this.loginForm.markAllAsTouched();
    return;
  }

  this.login(this.loginForm.getRawValue());
}

protected loginAsDemo(): void {
    this.login(DEMO_CREDENTIALS);
  }

  private login(credentials: AuthCredentials): void {
    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    this.authService
      .login(credentials)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/dashboard']),
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.status === 401
              ? 'Invalid username or password.'
              : 'Unable to sign in. Please try again.',
          );
        },
      });
  }
}
