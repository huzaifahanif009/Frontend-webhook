import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

/**
 * A one-off password re-check for a single sensitive action. Always starts locked — it holds no
 * "already unlocked" state of its own, so a fresh instance (new modal open, new route mount,
 * refresh, back/forward) always re-prompts rather than silently trusting a stale flag.
 */
@Component({
  selector: 'app-action-password-gate',
  imports: [FormsModule],
  templateUrl: './action-password-gate.html',
  styleUrl: './action-password-gate.scss'
})
export class ActionPasswordGate {
  private readonly auth = inject(AuthService);

  @Input() title = 'Password required';
  @Input() description = 'This action is protected — enter the password to continue.';
  @Output() readonly verified = new EventEmitter<void>();

  protected readonly password = signal('');
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.auth.verifyActionPassword(this.password())) {
      this.error.set(null);
      this.verified.emit();
    } else {
      this.error.set('Incorrect password.');
    }
    this.password.set('');
  }
}
