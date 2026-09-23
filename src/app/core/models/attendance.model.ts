export interface AttendanceRow {
  id: number;
  serialNumber: string;
  employeePin: string;
  employeeName: string | null;
  originalLogTime: string;
  logTimeUtc: string;
  verifyCode: string | null;
  statusCode: string | null;
  erpSyncedAtUtc: string | null;
  erpSyncSkippedAtUtc: string | null;
  erpSyncSkipReason: string | null;
  erpResyncRequestedAtUtc: string | null;
  processedAtUtc: string;
}

export interface AttendanceFilter {
  serialNumber?: string;
  employeePin?: string;
  employeeName?: string;
  verifyCode?: string;
  statusCode?: string;
  erpSynced?: boolean | null;
  resyncPending?: boolean | null;
  fromUtc?: string;
  toUtc?: string;
  take: number;
  skip: number;
}

export interface AttendanceResponse {
  total: number;
  take: number;
  skip: number;
  items: AttendanceRow[];
}

/** Mirrors ResyncAttendanceRequest on the backend. */
export interface ResyncRequest {
  ids?: number[];
  serialNumber?: string;
  employeePin?: string;
  employeeName?: string;
  verifyCode?: string;
  statusCode?: string;
  fromUtc?: string;
  toUtc?: string;
}

export interface ResyncResponse {
  requestedCount: number;
}

/** Mirrors ErpSyncRunResult on the backend. */
export interface ErpSyncRunResult {
  ran: boolean;
  message: string;
  pendingCount: number;
  mappedCount: number;
  affectedCount: number;
  skippedCount: number;
  excludedCount: number;
}

/** One row as parsed from an uploaded bulk-attendance file, before import — matches
 * BulkAttendancePreviewRow on the backend. */
export interface BulkAttendancePreviewRow {
  pin: string;
  name: string | null;
  timestamp: string;
  statusCode: string | null;
  verifyCode: string | null;
  isDuplicate: boolean;
  warning: string | null;
}

export interface ParseAttendanceFileResponse {
  total: number;
  rows: BulkAttendancePreviewRow[];
}

/** Mirrors BulkAttendanceImportRow on the backend. */
export interface BulkAttendanceImportRow {
  pin: string;
  name: string | null;
  timestamp: string;
  statusCode: string | null;
  verifyCode: string | null;
}

export interface BulkAttendanceImportRowResult {
  pin: string;
  timestamp: string;
  success: boolean;
  skipped: boolean;
  message: string;
}

export interface BulkImportAttendanceResponse {
  total: number;
  succeeded: number;
  skipped: number;
  failed: number;
  results: BulkAttendanceImportRowResult[];
}
