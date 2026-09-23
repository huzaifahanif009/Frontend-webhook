import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RuntimeConfig } from '../models/runtime-config.model';

/**
 * Fallback used only if public/config.json is missing or fails to load — see load() below.
 * Points at nothing usable on purpose; the real values belong in config.json, not in source.
 */
const FALLBACK_CONFIG: RuntimeConfig = {
  apiBaseUrl: '',
  apiKey: '',
  loginPassword: 'admin123',
  showResyncScreen: false,
  actionPassword: 'admin123'
};

/**
 * Loads /config.json (from the `public/` folder, so it ships next to index.html and is NOT
 * baked into the JS bundle) at app startup — see the app initializer in app.config.ts. That
 * file can be edited directly on the deployed server (no rebuild) to point at a different
 * backend, API key, or login password.
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private config: RuntimeConfig = FALLBACK_CONFIG;

  constructor(private readonly http: HttpClient) {}

  get(): RuntimeConfig {
    return this.config;
  }

  async load(): Promise<void> {
    try {
      const loaded = await firstValueFrom(this.http.get<Partial<RuntimeConfig>>('config.json'));
      this.config = { ...this.config, ...loaded };
    } catch {
      // config.json missing or invalid — keep FALLBACK_CONFIG.
    }
  }
}
