import { Injectable, inject, signal } from '@angular/core';
import { AppConfigService } from './app-config.service';

const STORAGE_KEY = 'zkteco.loggedIn';

/**
 * Simple fixed-password gate for the app itself — not real authentication. There's no user
 * database here; it just keeps casual visitors off the dashboard. The real protection is the
 * backend's X-Api-Key check, which is sent on every request from the runtime config's apiKey
 * (see api-key.interceptor.ts) and never entered by the user.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly appConfig = inject(AppConfigService);

  private readonly loggedInSignal = signal<boolean>(localStorage.getItem(STORAGE_KEY) === 'true');
  readonly loggedIn = this.loggedInSignal.asReadonly();

  isAuthenticated(): boolean {
    return this.loggedInSignal();
  }

  login(password: string): boolean {
    const ok = password === this.appConfig.get().loginPassword;
    if (ok) {
      this.loggedInSignal.set(true);
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    return ok;
  }

  logout(): void {
    this.loggedInSignal.set(false);
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Checks a separate password (config.json's actionPassword, distinct from loginPassword) for a
   * single sensitive action (e.g. requesting a device resend attendance, or bulk ERP resync) —
   * does not touch the logged-in session state. This is a frontend-only gate: it stops casual use
   * of the action, but anyone who can already open DevTools and call the underlying service/HTTP
   * call directly bypasses it, the same way the main login itself can be bypassed — there's no
   * backend check behind either one.
   */
  verifyActionPassword(password: string): boolean {
    return password === this.appConfig.get().actionPassword;
  }
}
