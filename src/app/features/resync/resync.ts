import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../core/services/attendance.service';
import { AttendanceRow } from '../../core/models/attendance.model';
import { ActionPasswordGate } from '../../shared/action-password-gate/action-password-gate';

const PAGE_SIZE = 50;

@Component({
  selector: 'app-resync',
  imports: [FormsModule, ActionPasswordGate],
  templateUrl: './resync.html',
  styleUrl: './resync.scss'
})
export class Resync implements OnInit {
  private readonly attendanceService = inject(AttendanceService);

  // Starts locked on every mount — a fresh component instance is created on refresh, on direct
  // navigation to /resync, and (by default, Angular doesn't reuse route component instances)
  // when coming back via browser back/forward — so there's no stale "already unlocked" state to
  // leak across any of those paths. Nothing below is fetched until this is true.
  protected readonly unlocked = signal(false);

  protected readonly rows = signal<AttendanceRow[]>([]);
  protected readonly total = signal(0);
  protected readonly skip = signal(0);
  protected readonly pageSize = signal(PAGE_SIZE);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly actionMessage = signal<string | null>(null);

  protected readonly serialNumber = signal('');
  protected readonly employeePin = signal('');
  protected readonly employeeName = signal('');
  protected readonly verifyCode = signal('');
  protected readonly statusCode = signal('');
  protected readonly resyncStatus = signal<'all' | 'pending' | 'none'>('all');
  // Which rows are even eligible to resync: ones already synced (force a corrected re-push) or
  // ones skipped/never synced (retry — e.g. a device that's now registered in ERP). Mirrors the
  // same eligibility the backend's resync endpoint actually accepts.
  protected readonly rowState = signal<'synced' | 'unsynced'>('unsynced');
  protected readonly fromDate = signal('');
  protected readonly toDate = signal('');

  protected readonly selectedIds = signal<Set<number>>(new Set());

  ngOnInit(): void {
    // Deliberately not loading here — see unlocked above. onUnlocked() below does the first
    // load once the password gate passes.
  }

  protected onUnlocked(): void {
    this.unlocked.set(true);
    this.search();
  }

  protected search(): void {
    this.skip.set(0);
    this.selectedIds.set(new Set());
    this.actionMessage.set(null);
    this.load();
  }

  protected reset(): void {
    this.serialNumber.set('');
    this.employeePin.set('');
    this.employeeName.set('');
    this.verifyCode.set('');
    this.statusCode.set('');
    this.resyncStatus.set('all');
    this.rowState.set('unsynced');
    this.fromDate.set('');
    this.toDate.set('');
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

  protected toggleSelected(id: number): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds.set(next);
  }

  protected isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  protected allOnPageSelected(): boolean {
    const rows = this.rows();
    return rows.length > 0 && rows.every((r) => this.selectedIds().has(r.id));
  }

  protected toggleSelectAllOnPage(): void {
    const rows = this.rows();
    const next = new Set(this.selectedIds());
    if (this.allOnPageSelected()) {
      rows.forEach((r) => next.delete(r.id));
    } else {
      rows.forEach((r) => next.add(r.id));
    }
    this.selectedIds.set(next);
  }

  protected resyncSelected(): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) {
      return;
    }

    this.attendanceService.requestResync({ ids }).subscribe({
      next: (res) => {
        this.actionMessage.set(`Resync requested for ${res.requestedCount} row(s).`);
        this.selectedIds.set(new Set());
        this.load();
      },
      error: () => this.actionMessage.set('Failed to request resync.')
    });
  }

  protected resyncAllMatching(): void {
    if (!confirm(`Request resync for all ${this.total()} row(s) matching the current filter?`)) {
      return;
    }

    this.attendanceService
      .requestResync({
        serialNumber: this.serialNumber().trim() || undefined,
        employeePin: this.employeePin().trim() || undefined,
        employeeName: this.employeeName().trim() || undefined,
        verifyCode: this.verifyCode().trim() || undefined,
        statusCode: this.statusCode().trim() || undefined,
        fromUtc: this.fromDate() ? new Date(this.fromDate()).toISOString() : undefined,
        toUtc: this.toDate() ? new Date(this.toDate()).toISOString() : undefined
      })
      .subscribe({
        next: (res) => {
          this.actionMessage.set(`Resync requested for ${res.requestedCount} row(s).`);
          this.load();
        },
        error: () => this.actionMessage.set('Failed to request resync.')
      });
  }

  protected static readonly SKIP_REASON_LABELS: Record<string, string> = {
    OFFLINE: 'Device registered as offline-connectivity in ERP',
    SYNC_DISABLED: 'Syncing is turned off for this device',
    NOT_REGISTERED: 'Device is not registered in ERP',
    MAPPING_ERROR: 'Could not map this row for ERP (data issue)'
  };

  protected statusOf(row: AttendanceRow): { label: string; cssClass: string; title: string | null } {
    if (row.erpSyncedAtUtc) {
      return { label: row.erpSyncedAtUtc, cssClass: 'badge-success', title: null };
    }
    if (row.erpSyncSkippedAtUtc) {
      const reason = row.erpSyncSkipReason ?? '';
      const title = Resync.SKIP_REASON_LABELS[reason] ?? 'Excluded from ERP sync';
      const isFailure = reason === 'MAPPING_ERROR';
      return { label: isFailure ? 'Failed' : 'Skipped', cssClass: isFailure ? 'badge-danger' : 'badge-muted', title };
    }
    return { label: 'Pending', cssClass: 'badge-warning', title: null };
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    const resyncStatus = this.resyncStatus();
    const resyncPending = resyncStatus === 'all' ? null : resyncStatus === 'pending';

    this.attendanceService
      .search({
        serialNumber: this.serialNumber().trim() || undefined,
        employeePin: this.employeePin().trim() || undefined,
        employeeName: this.employeeName().trim() || undefined,
        verifyCode: this.verifyCode().trim() || undefined,
        statusCode: this.statusCode().trim() || undefined,
        erpSynced: this.rowState() === 'synced',
        resyncPending,
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
