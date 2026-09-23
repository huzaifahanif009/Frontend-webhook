import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EMPTY, catchError, interval, startWith, switchMap } from 'rxjs';
import { DeviceService } from '../../core/services/device.service';
import { AdmsDevice } from '../../core/models/device.model';
import { BulkUserImportRowResult, DeviceUserStatus } from '../../core/models/device-user.model';

const REFRESH_INTERVAL_MS = 15000;
const SUPPORTED_EXTENSIONS = ['.dat', '.csv'];

interface EditableBulkRow {
  pin: string;
  name: string;
  privilege: string;
  card: string;
  warning: string | null;
  isDuplicate: boolean;
  included: boolean;
  result: BulkUserImportRowResult | null;
}

@Component({
  selector: 'app-device-users',
  imports: [FormsModule],
  templateUrl: './device-users.html',
  styleUrl: './device-users.scss'
})
export class DeviceUsers implements OnInit {
  private readonly deviceService = inject(DeviceService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly devices = signal<AdmsDevice[]>([]);
  protected readonly loadingDevices = signal(true);
  protected readonly selectedSerial = signal<string>('');

  protected readonly users = signal<DeviceUserStatus[]>([]);
  protected readonly loadingUsers = signal(false);

  protected readonly pin = signal('');
  protected readonly name = signal('');
  protected readonly privilege = signal('0');
  protected readonly card = signal('');

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly formSuccess = signal<string | null>(null);

  // Bulk upload — parse-then-review-then-import, never skips the review step.
  protected readonly fileName = signal<string | null>(null);
  protected readonly parsing = signal(false);
  protected readonly parseError = signal<string | null>(null);
  protected readonly previewRows = signal<EditableBulkRow[]>([]);
  protected readonly importing = signal(false);
  protected readonly importSummary = signal<{ succeeded: number; failed: number } | null>(null);

  ngOnInit(): void {
    this.deviceService.getDevices(true, 500).subscribe({
      next: (devices) => {
        this.devices.set(devices.filter((d) => d.protocol === 'ADMS'));
        this.loadingDevices.set(false);
      },
      error: () => this.loadingDevices.set(false)
    });
  }

  protected get admsDevices(): AdmsDevice[] {
    return this.devices();
  }

  protected selectDevice(serial: string): void {
    this.selectedSerial.set(serial);
    this.formError.set(null);
    this.formSuccess.set(null);
    this.pin.set('');
    this.name.set('');
    this.privilege.set('0');
    this.card.set('');
    this.users.set([]);
    this.clearUpload();

    if (!serial) {
      return;
    }

    interval(REFRESH_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => {
          this.loadingUsers.set(true);
          return this.deviceService.getUsers(serial).pipe(
            catchError(() => {
              this.loadingUsers.set(false);
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((users) => {
        this.users.set(users);
        this.loadingUsers.set(false);
      });
  }

  protected submit(): void {
    const serial = this.selectedSerial();
    if (!serial) {
      return;
    }

    const pin = this.pin().trim();
    const name = this.name().trim();

    this.formError.set(null);
    this.formSuccess.set(null);

    if (!/^[0-9]{1,20}$/.test(pin)) {
      this.formError.set('PIN must be 1-20 digits.');
      return;
    }

    if (!name) {
      this.formError.set('Name is required.');
      return;
    }

    // Instant feedback using the already-loaded list for this device — the backend re-checks
    // this too (it's the authority), but this avoids a round-trip for the common case.
    const duplicate = this.users().some((u) => u.pin === pin && u.status !== 'Failed');
    if (duplicate) {
      this.formError.set(`PIN '${pin}' already exists (or is pending) on this device.`);
      return;
    }

    this.submitting.set(true);

    this.deviceService
      .addUser(serial, {
        pin,
        name,
        privilege: this.privilege().trim() || undefined,
        card: this.card().trim() || undefined
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.formSuccess.set(res.message);
          this.pin.set('');
          this.name.set('');
          this.card.set('');
          this.deviceService.getUsers(serial).subscribe((users) => this.users.set(users));
        },
        error: (err) => {
          this.submitting.set(false);
          this.formError.set(err?.error?.message ?? 'Could not queue this user.');
        }
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
        `Unsupported file type '${extension}'. Supported: .dat (device USB export) or .csv (header row: Pin, Name, Privilege, Card).`
      );
      return;
    }

    const serial = this.selectedSerial();
    if (!serial) {
      return;
    }

    this.fileName.set(file.name);
    this.parsing.set(true);
    this.parseError.set(null);
    this.previewRows.set([]);
    this.importSummary.set(null);

    this.deviceService.parseUserFile(serial, file).subscribe({
      next: (res) => {
        this.parsing.set(false);
        this.previewRows.set(
          res.rows.map((row) => ({
            pin: row.pin,
            name: row.name,
            privilege: row.privilege,
            card: row.card ?? '',
            warning: row.warning,
            isDuplicate: row.isDuplicate,
            // Rows with a duplicate PIN or a warning (e.g. missing name) start unchecked so a
            // big file doesn't silently import something that needs a human's eyes first — they
            // stay visible and editable, just not pre-selected.
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
  }

  protected toggleRow(row: EditableBulkRow): void {
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

  protected importSelected(): void {
    const serial = this.selectedSerial();
    const rows = this.previewRows().filter((r) => r.included);
    if (!serial || rows.length === 0) {
      return;
    }

    this.importing.set(true);
    this.importSummary.set(null);
    rows.forEach((r) => (r.result = null));

    this.deviceService
      .bulkImportUsers(
        serial,
        rows.map((r) => ({
          pin: r.pin.trim(),
          name: r.name.trim(),
          privilege: r.privilege.trim() || undefined,
          card: r.card.trim() || undefined
        }))
      )
      .subscribe({
        next: (res) => {
          this.importing.set(false);
          this.importSummary.set({ succeeded: res.succeeded, failed: res.failed });
          // Results come back in the same order the rows were submitted in.
          rows.forEach((row, i) => (row.result = res.results[i] ?? null));
          this.deviceService.getUsers(serial).subscribe((users) => this.users.set(users));
        },
        error: (err) => {
          this.importing.set(false);
          this.parseError.set(err?.error?.message ?? 'Could not import these users.');
        }
      });
  }
}
