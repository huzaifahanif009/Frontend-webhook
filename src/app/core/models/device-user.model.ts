export interface AddDeviceUserRequest {
  pin: string;
  name: string;
  privilege?: string;
  card?: string;
}

export interface AddDeviceUserResponse {
  message: string;
  commandId: number | null;
}

export interface DeviceUserStatus {
  pin: string;
  name: string;
  privilege: string | null;
  card: string | null;
  commandId: number;
  requestedAtUtc: string;
  status: string;
  returnCode: number | null;
  acknowledgedAtUtc: string | null;
}

/** One row as parsed from an uploaded bulk-user file, before import — matches BulkUserPreviewRow
 * on the backend. */
export interface BulkUserPreviewRow {
  pin: string;
  name: string;
  privilege: string;
  card: string | null;
  warning: string | null;
  isDuplicate: boolean;
}

export interface ParseUserFileResponse {
  total: number;
  rows: BulkUserPreviewRow[];
}

export interface BulkUserImportRowResult {
  pin: string;
  success: boolean;
  message: string;
}

export interface BulkImportUsersResponse {
  total: number;
  succeeded: number;
  failed: number;
  results: BulkUserImportRowResult[];
}
