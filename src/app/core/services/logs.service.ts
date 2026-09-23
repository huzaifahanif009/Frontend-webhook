import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RawLogEntry } from '../models/logs.model';
import { AppConfigService } from './app-config.service';

@Injectable({ providedIn: 'root' })
export class LogsService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);

  private get base(): string {
    return `${this.appConfig.get().apiBaseUrl}/api/dashboard`;
  }

  getRecentLogs(take = 200): Observable<RawLogEntry[]> {
    const params = new HttpParams().set('take', String(take));
    return this.http.get<RawLogEntry[]>(`${this.base}/raw-logs`, { params });
  }
}
