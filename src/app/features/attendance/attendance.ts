import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../core/services/attendance.service';
import { AttendanceRow } from '../../core/models/attendance.model';

@Component({
  selector: 'app-attendance',
  imports: [FormsModule],
  templateUrl: './attendance.html',
  styleUrl: './attendance.scss'
})
export class Attendance implements OnInit {
  private readonly attendanceService = inject(AttendanceService);

  protected readonly rows = signal<AttendanceRow[]>([]);
  protected readonly total = signal(0);
  protected readonly skip = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly serialNumber = signal('');
  protected readonly employeePin = signal('');
  protected readonly employeeName = signal('');
  protected readonly verifyCode = signal('');
  protected readonly statusCode = signal('');
  protected readonly erpSynced = signal<'all' | 'true' | 'false'>('all');
  protected readonly fromDate = signal('');
  protected readonly toDate = signal('');
  protected readonly pageSize = signal(50);

  protected readonly syncing = signal(false);
  protected readonly syncMessage = signal<string | null>(null);

  private static readonly SKIP_REASON_LABELS: Record<string, string> = {
    OFFLINE: 'Device registered as offline-connectivity in ERP',
    SYNC_DISABLED: 'Syncing is turned off for this device',
    NOT_REGISTERED: 'Device is not registered in ERP',
    MAPPING_ERROR: 'Could not map this row for ERP (data issue)',
    HISTORICAL_IMPORT: 'Backfilled via bulk import — not auto-synced; use Resync to opt in'
  };

  ngOnInit(): void {
    this.search();
  }

  protected syncStatus(row: AttendanceRow): { label: string; cssClass: string; title: string | null } {
    if (row.erpSyncedAtUtc) {
      return { label: row.erpSyncedAtUtc, cssClass: 'badge-success', title: null };
    }

    if (row.erpSyncSkippedAtUtc) {
      const reason = row.erpSyncSkipReason ?? '';
      const title = Attendance.SKIP_REASON_LABELS[reason] ?? 'Excluded from ERP sync';
      const isFailure = reason === 'MAPPING_ERROR';
      return {
        label: isFailure ? 'Failed' : 'Skipped',
        cssClass: isFailure ? 'badge-danger' : 'badge-muted',
        title
      };
    }

    return { label: 'Pending', cssClass: 'badge-warning', title: null };
  }

  protected syncNow(): void {
    this.syncing.set(true);
    this.syncMessage.set(null);

    this.attendanceService.runSyncNow().subscribe({
      next: (result) => {
        this.syncing.set(false);
        this.syncMessage.set(result.message);
        this.load();
      },
      error: (err) => {
        this.syncing.set(false);
        this.syncMessage.set(err?.error?.detail ?? err?.error?.message ?? 'Could not run ERP sync.');
      }
    });
  }

  protected search(): void {
    this.skip.set(0);
    this.load();
  }

  protected reset(): void {
    this.serialNumber.set('');
    this.employeePin.set('');
    this.employeeName.set('');
    this.verifyCode.set('');
    this.statusCode.set('');
    this.erpSynced.set('all');
    this.fromDate.set('');
    this.toDate.set('');
    this.search();
  }

  protected applyPreset(preset: 'today' | 'last7' | 'thisMonth'): void {
    const now = new Date();
    const toIso = (d: Date) => d.toISOString().slice(0, 10);

    if (preset === 'today') {
      this.fromDate.set(toIso(now));
      this.toDate.set(toIso(now));
    } else if (preset === 'last7') {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      this.fromDate.set(toIso(from));
      this.toDate.set(toIso(now));
    } else {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      this.fromDate.set(toIso(from));
      this.toDate.set(toIso(now));
    }

    this.search();
  }

  protected nextPage(): void {
    if (this.skip() + this.pageSize() >= this.total()) {
      return;
    }
    this.skip.set(this.skip() + this.pageSize());
    this.load();
  }

  protected prevPage(): void {
    this.skip.set(Math.max(0, this.skip() - this.pageSize()));
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    const erpSynced = this.erpSynced();

    this.attendanceService
      .search({
        serialNumber: this.serialNumber().trim() || undefined,
        employeePin: this.employeePin().trim() || undefined,
        employeeName: this.employeeName().trim() || undefined,
        verifyCode: this.verifyCode().trim() || undefined,
        statusCode: this.statusCode().trim() || undefined,
        erpSynced: erpSynced === 'all' ? null : erpSynced === 'true',
        fromUtc: this.fromDate() ? new Date(this.fromDate()).toISOString() : undefined,
        toUtc: this.toDate() ? new Date(this.toDate()).toISOString() : undefined,
        take: this.pageSize(),
        skip: this.skip()
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Could not load attendance.');
          this.loading.set(false);
        }
      });
  }
}
