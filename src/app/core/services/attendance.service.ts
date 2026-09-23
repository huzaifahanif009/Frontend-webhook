import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AttendanceFilter,
  AttendanceResponse,
  BulkAttendanceImportRow,
  BulkImportAttendanceResponse,
  ErpSyncRunResult,
  ParseAttendanceFileResponse,
  ResyncRequest,
  ResyncResponse
} from '../models/attendance.model';
import { AppConfigService } from './app-config.service';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  // /api/integration/attendance supports real server-side filters; /api/dashboard/attendance
  // (take-only, no filters) is used nowhere in this app for that reason.
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);

  private get apiBaseUrl(): string {
    return this.appConfig.get().apiBaseUrl;
  }

  search(filter: AttendanceFilter): Observable<AttendanceResponse> {
    let params = new HttpParams()
      .set('take', String(filter.take))
      .set('skip', String(filter.skip));

    if (filter.serialNumber) {
      params = params.set('serialNumber', filter.serialNumber);
    }
    if (filter.employeePin) {
      params = params.set('employeePin', filter.employeePin);
    }
    if (filter.employeeName) {
      params = params.set('employeeName', filter.employeeName);
    }
    if (filter.verifyCode) {
      params = params.set('verifyCode', filter.verifyCode);
    }
    if (filter.statusCode) {
      params = params.set('statusCode', filter.statusCode);
    }
    if (filter.erpSynced !== null && filter.erpSynced !== undefined) {
      params = params.set('erpSynced', String(filter.erpSynced));
    }
    if (filter.resyncPending !== null && filter.resyncPending !== undefined) {
      params = params.set('resyncPending', String(filter.resyncPending));
    }
    if (filter.fromUtc) {
      params = params.set('fromUtc', filter.fromUtc);
    }
    if (filter.toUtc) {
      params = params.set('toUtc', filter.toUtc);
    }

    return this.http.get<AttendanceResponse>(`${this.apiBaseUrl}/api/integration/attendance`, {
      params
    });
  }

  requestResync(request: ResyncRequest): Observable<ResyncResponse> {
    return this.http.post<ResyncResponse>(
      `${this.apiBaseUrl}/api/dashboard/attendance/resync`,
      request
    );
  }

  runSyncNow(): Observable<ErpSyncRunResult> {
    return this.http.post<ErpSyncRunResult>(`${this.apiBaseUrl}/api/dashboard/erp-sync/run-now`, {});
  }

  /** Parses an uploaded .dat/.txt (raw ATTLOG export) or .csv historical attendance file into
   * rows for review — nothing is imported yet. */
  parseAttendanceFile(serialNumber: string, file: File): Observable<ParseAttendanceFileResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ParseAttendanceFileResponse>(
      `${this.apiBaseUrl}/api/dashboard/devices/${encodeURIComponent(serialNumber)}/attendance/parse-file`,
      formData
    );
  }

  /** Imports the reviewed (and possibly edited) rows. syncToErp=false (the default) marks them as
   * intentionally excluded from the next ERP sync cycle, since the sync worker has no concept of
   * "old" data and would otherwise push a big historical backfill to Odoo mixed in with live
   * punches. */
  bulkImportAttendance(
    serialNumber: string,
    rows: BulkAttendanceImportRow[],
    syncToErp: boolean
  ): Observable<BulkImportAttendanceResponse> {
    return this.http.post<BulkImportAttendanceResponse>(
      `${this.apiBaseUrl}/api/dashboard/devices/${encodeURIComponent(serialNumber)}/attendance/bulk`,
      { rows, syncToErp }
    );
  }
}
