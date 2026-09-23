import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly password = signal('');
  protected readonly error = signal<string | null>(null);
  // Presentation-only state — does not touch auth logic.
  protected readonly showPassword = signal(false);
  protected readonly currentYear = new Date().getFullYear();

  protected submit(): void {
    if (this.auth.login(this.password())) {
      this.router.navigate(['/dashboard']);
    } else {
      this.error.set('Incorrect password.');
    }
  }

  protected toggleShowPassword(): void {
    this.showPassword.update((value) => !value);
  }
}
