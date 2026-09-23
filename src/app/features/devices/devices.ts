import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EMPTY, Observable, catchError, forkJoin, interval, startWith, switchMap } from 'rxjs';
import { DeviceService } from '../../core/services/device.service';
import { AdmsDevice, DeviceConnectionStatusResponse, DeviceRow } from '../../core/models/device.model';
import { ActionPasswordGate } from '../../shared/action-password-gate/action-password-gate';

const REFRESH_INTERVAL_MS = 20000;

interface FetchResult {
  devices: AdmsDevice[];
  status: DeviceConnectionStatusResponse;
}

interface RecoveryHistoryEntry {
  serialNumber: string;
  fromUtc: string;
  toUtc: string;
  message: string;
  requestedAt: Date;
}

@Component({
  selector: 'app-devices',
  imports: [FormsModule, ActionPasswordGate],
  templateUrl: './devices.html',
  styleUrl: './devices.scss'
})
export class Devices implements OnInit {
  private readonly deviceService = inject(DeviceService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly devices = signal<DeviceRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly registeredOnly = signal(true);

  // "Recover missed attendance" panel state — asks a device to resend its stored ATTLOG for a
  // window (e.g. punches lost during a server outage). One panel shared across rows, keyed by
  // which device it's currently open for.
  protected readonly recoverySerial = signal<string | null>(null);
  protected readonly recoveryFrom = signal('');
  protected readonly recoveryTo = signal('');
  protected readonly recoverySubmitting = signal(false);
  protected readonly recoveryMessage = signal<string | null>(null);
  protected readonly recoveryError = signal<string | null>(null);
  // Re-locked every time the panel opens — see openRecovery(). A fresh ActionPasswordGate
  // instance also starts locked on its own, but this flag is what actually gates the real form.
  protected readonly recoveryUnlocked = signal(false);
  // Visible record of what's been requested this session, since a queued command has no other
  // status surface yet — appended to after each successful request, newest first.
  protected readonly recoveryHistory = signal<RecoveryHistoryEntry[]>([]);

  ngOnInit(): void {
    // Auto-refreshes so device status stays live without needing a manual refresh — the
    // backend's online window (90s) is comfortably above the device poll interval (30s), so
    // this should now show a stable, accurate status rather than flapping between calls.
    interval(REFRESH_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.fetchOnce()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => this.applyResult(result));
  }

  protected refresh(): void {
    this.fetchOnce().subscribe((result) => this.applyResult(result));
  }

  protected toggleRegisteredOnly(): void {
    this.registeredOnly.set(!this.registeredOnly());
    this.refresh();
  }

  protected toggleSync(device: DeviceRow): void {
    const nextEnabled = !device.syncEnabled;

    this.deviceService.setSyncEnabled(device.serialNumber, nextEnabled).subscribe({
      next: (res) => {
        this.devices.set(
          this.devices().map((d) =>
            d.serialNumber === res.serialNumber ? { ...d, syncEnabled: res.syncEnabled } : d
          )
        );
      },
      error: () => this.error.set(`Could not change sync state for ${device.serialNumber}.`)
    });
  }

  protected openRecovery(serialNumber: string): void {
    this.recoverySerial.set(serialNumber);
    this.recoveryFrom.set('');
    this.recoveryTo.set('');
    this.recoveryMessage.set(null);
    this.recoveryError.set(null);
    this.recoveryUnlocked.set(false);
  }

  protected closeRecovery(): void {
    this.recoverySerial.set(null);
    this.recoveryUnlocked.set(false);
  }

  protected onRecoveryUnlocked(): void {
    this.recoveryUnlocked.set(true);
  }

  protected submitRecovery(): void {
    const serialNumber = this.recoverySerial();
    if (!serialNumber || !this.recoveryFrom() || !this.recoveryTo()) {
      return;
    }

    this.recoverySubmitting.set(true);
    this.recoveryMessage.set(null);
    this.recoveryError.set(null);

    const fromUtc = new Date(this.recoveryFrom()).toISOString();
    const toUtc = new Date(this.recoveryTo()).toISOString();

    this.deviceService.requestAttlog(serialNumber, { fromUtc, toUtc }).subscribe({
      next: (res) => {
        this.recoverySubmitting.set(false);
        this.recoveryMessage.set(res.message);
        this.recoveryHistory.update((entries) => [
          { serialNumber, fromUtc, toUtc, message: res.message, requestedAt: new Date() },
          ...entries
        ]);
      },
      error: (err) => {
        this.recoverySubmitting.set(false);
        this.recoveryError.set(err?.error?.message ?? 'Could not request attendance log.');
      }
    });
  }

  private fetchOnce(): Observable<FetchResult> {
    this.loading.set(true);
    this.error.set(null);

    return forkJoin({
      devices: this.deviceService.getDevices(this.registeredOnly()),
      status: this.deviceService.getConnectionStatus()
    }).pipe(
      catchError(() => {
        this.error.set('Could not load devices.');
        this.loading.set(false);
        return EMPTY;
      })
    );
  }

  private applyResult({ devices, status }: FetchResult): void {
    const statusBySerial = new Map(status.items.map((item) => [item.serialNumber, item]));
    this.devices.set(
      devices.map((device) => {
        const online = statusBySerial.get(device.serialNumber);
        return {
          ...device,
          isOnline: online ? online.isOnline : null,
          lastActivityUtc: online ? online.lastActivityUtc : null
        };
      })
    );
    this.loading.set(false);
  }
}
