import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AdmsDevice,
  DeviceConnectionStatusResponse,
  RequestAttlogRequest,
  RequestAttlogResponse,
  SetDeviceSyncResponse
} from '../models/device.model';
import {
  AddDeviceUserRequest,
  AddDeviceUserResponse,
  BulkImportUsersResponse,
  DeviceUserStatus,
  ParseUserFileResponse
} from '../models/device-user.model';
import { AppConfigService } from './app-config.service';

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);

  private get base(): string {
    return `${this.appConfig.get().apiBaseUrl}/api/dashboard`;
  }

  getDevices(registeredOnly: boolean, take = 200): Observable<AdmsDevice[]> {
    const params = new HttpParams()
      .set('registeredOnly', String(registeredOnly))
      .set('take', String(take));
    return this.http.get<AdmsDevice[]>(`${this.base}/devices`, { params });
  }

  getConnectionStatus(): Observable<DeviceConnectionStatusResponse> {
    return this.http.get<DeviceConnectionStatusResponse>(`${this.base}/devices/connection-status`);
  }

  setSyncEnabled(serialNumber: string, enabled: boolean): Observable<SetDeviceSyncResponse> {
    return this.http.post<SetDeviceSyncResponse>(
      `${this.base}/devices/${encodeURIComponent(serialNumber)}/sync`,
      { enabled }
    );
  }

  addUser(serialNumber: string, request: AddDeviceUserRequest): Observable<AddDeviceUserResponse> {
    return this.http.post<AddDeviceUserResponse>(
      `${this.base}/devices/${encodeURIComponent(serialNumber)}/users`,
      request
    );
  }

  getUsers(serialNumber: string): Observable<DeviceUserStatus[]> {
    return this.http.get<DeviceUserStatus[]>(
      `${this.base}/devices/${encodeURIComponent(serialNumber)}/users`
    );
  }

  /** Actively asks the device to resend its stored attendance log for a window — for recovering
   * punches that never reached us live (e.g. during a server outage). ADMS devices only. */
  requestAttlog(serialNumber: string, request: RequestAttlogRequest): Observable<RequestAttlogResponse> {
    return this.http.post<RequestAttlogResponse>(
      `${this.base}/devices/${encodeURIComponent(serialNumber)}/request-attlog`,
      request
    );
  }

  /** Parses an uploaded .dat (ZKTeco user.dat USB export) or .csv bulk-user file into rows for
   * review — nothing is imported yet. */
  parseUserFile(serialNumber: string, file: File): Observable<ParseUserFileResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ParseUserFileResponse>(
      `${this.base}/devices/${encodeURIComponent(serialNumber)}/users/parse-file`,
      formData
    );
  }

  /** Imports the reviewed (and possibly edited) rows — each one goes through the exact same
   * validation/duplicate-check/queueing as the single "Add user" form. */
  bulkImportUsers(
    serialNumber: string,
    rows: AddDeviceUserRequest[]
  ): Observable<BulkImportUsersResponse> {
    return this.http.post<BulkImportUsersResponse>(
      `${this.base}/devices/${encodeURIComponent(serialNumber)}/users/bulk`,
      rows
    );
  }
}
