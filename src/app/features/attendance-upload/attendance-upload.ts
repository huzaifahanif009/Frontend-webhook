import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../core/services/attendance.service';
import { DeviceService } from '../../core/services/device.service';
import { BulkAttendanceImportRowResult } from '../../core/models/attendance.model';
import { AdmsDevice } from '../../core/models/device.model';
import { ActionPasswordGate } from '../../shared/action-password-gate/action-password-gate';

const SUPPORTED_EXTENSIONS = ['.dat', '.txt', '.csv'];

interface EditableBulkAttendanceRow {
  pin: string;
  name: string;
  timestamp: string;
  statusCode: string;
  verifyCode: string;
  isDuplicate: boolean;
  warning: string | null;
  included: boolean;
  result: BulkAttendanceImportRowResult | null;
}

@Component({
  selector: 'app-attendance-upload',
  imports: [FormsModule, ActionPasswordGate],
  templateUrl: './attendance-upload.html',
  styleUrl: './attendance-upload.scss'
})
export class AttendanceUpload implements OnInit {
  private readonly attendanceService = inject(AttendanceService);
  private readonly deviceService = inject(DeviceService);

  // Bulk historical-attendance upload — parse-then-review-then-import, same pattern as the
  // Device Users bulk uploader.
  protected readonly uploadDevices = signal<AdmsDevice[]>([]);
  protected readonly uploadSerial = signal('');
  protected readonly fileName = signal<string | null>(null);
  protected readonly parsing = signal(false);
  protected readonly parseError = signal<string | null>(null);
  protected readonly previewRows = signal<EditableBulkAttendanceRow[]>([]);
  protected readonly syncToErp = signal(false);
  protected readonly importing = signal(false);
  protected readonly importSummary = signal<{ succeeded: number; skipped: number; failed: number } | null>(null);
  protected readonly showImportGate = signal(false);

  ngOnInit(): void {
    this.deviceService.getDevices(true, 500).subscribe({
      next: (devices) => this.uploadDevices.set(devices),
      error: () => this.uploadDevices.set([])
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    // Reset immediately so selecting the exact same file again still fires a change event.
    input.value = '';

    if (!file) {
      return;
    }

    const extension = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      this.parseError.set(
        `Unsupported file type '${extension}'. Supported: .dat or .txt (raw ATTLOG export from a device's USB backup) or .csv (header row: Pin, Timestamp, Status, Verify, Name).`
      );
      return;
    }

    const serial = this.uploadSerial().trim();
    if (!serial) {
      this.parseError.set('Pick or type the source device serial number first.');
      return;
    }

    this.fileName.set(file.name);
    this.parsing.set(true);
    this.parseError.set(null);
    this.previewRows.set([]);
    this.importSummary.set(null);
    this.showImportGate.set(false);

    this.attendanceService.parseAttendanceFile(serial, file).subscribe({
      next: (res) => {
        this.parsing.set(false);
        this.previewRows.set(
          res.rows.map((row) => ({
            pin: row.pin,
            name: row.name ?? '',
            timestamp: row.timestamp.slice(0, 19),
            statusCode: row.statusCode ?? '',
            verifyCode: row.verifyCode ?? '',
            isDuplicate: row.isDuplicate,
            warning: row.warning,
            // Duplicate/flagged rows start unchecked so a big file doesn't silently import
            // something that needs a human's eyes first — they stay visible and editable.
            included: !row.isDuplicate && !row.warning,
            result: null
          }))
        );
      },
      error: (err) => {
        this.parsing.set(false);
        this.parseError.set(err?.error?.message ?? 'Could not read this file.');
      }
    });
  }

  protected clearUpload(): void {
    this.fileName.set(null);
    this.parsing.set(false);
    this.parseError.set(null);
    this.previewRows.set([]);
    this.importSummary.set(null);
    this.showImportGate.set(false);
  }

  protected toggleRow(row: EditableBulkAttendanceRow): void {
    row.included = !row.included;
  }

  protected get includedCount(): number {
    return this.previewRows().filter((r) => r.included).length;
  }

  protected get allIncluded(): boolean {
    const rows = this.previewRows();
    return rows.length > 0 && rows.every((r) => r.included);
  }

  protected toggleAll(): void {
    const next = !this.allIncluded;
    this.previewRows().forEach((r) => (r.included = next));
  }

  protected requestImport(): void {
    if (this.includedCount === 0) {
      return;
    }
    this.showImportGate.set(true);
  }

  protected cancelImport(): void {
    this.showImportGate.set(false);
  }

  protected confirmImport(): void {
    this.showImportGate.set(false);

    const serial = this.uploadSerial().trim();
    const rows = this.previewRows().filter((r) => r.included);
    if (!serial || rows.length === 0) {
      return;
    }

    this.importing.set(true);
    this.importSummary.set(null);
    rows.forEach((r) => (r.result = null));

    this.attendanceService
      .bulkImportAttendance(
        serial,
        rows.map((r) => ({
          pin: r.pin.trim(),
          name: r.name.trim() || null,
          timestamp: r.timestamp,
          statusCode: r.statusCode.trim() || null,
          verifyCode: r.verifyCode.trim() || null
        })),
        this.syncToErp()
      )
      .subscribe({
        next: (res) => {
          this.importing.set(false);
          this.importSummary.set({ succeeded: res.succeeded, skipped: res.skipped, failed: res.failed });
          // Results come back in the same order the rows were submitted in.
          rows.forEach((row, i) => (row.result = res.results[i] ?? null));
        },
        error: (err) => {
          this.importing.set(false);
          this.parseError.set(err?.error?.message ?? 'Could not import these rows.');
        }
      });
  }
}
