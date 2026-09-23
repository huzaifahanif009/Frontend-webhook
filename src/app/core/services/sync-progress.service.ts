import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SyncProgress } from '../models/sync-progress.model';
import { AppConfigService } from './app-config.service';

@Injectable({ providedIn: 'root' })
export class SyncProgressService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);

  get(): Observable<SyncProgress> {
    return this.http.get<SyncProgress>(
      `${this.appConfig.get().apiBaseUrl}/api/dashboard/erp-sync/progress`
    );
  }
}
