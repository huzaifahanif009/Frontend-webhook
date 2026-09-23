import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, interval, startWith, switchMap } from 'rxjs';
import { SyncProgressService } from '../../core/services/sync-progress.service';
import { SyncProgress } from '../../core/models/sync-progress.model';

// Matches the backend's own sync loop cadence (ErpSync:IntervalSeconds default) — no point
// polling faster than the data underneath could actually change.
const POLL_INTERVAL_MS = 10000;

@Component({
  selector: 'app-notification-bell',
  imports: [],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss'
})
export class NotificationBell implements OnInit {
  private readonly syncProgressService = inject(SyncProgressService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly progress = signal<SyncProgress | null>(null);
  protected readonly open = signal(false);

  ngOnInit(): void {
    interval(POLL_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.syncProgressService.get().pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((progress) => this.progress.set(progress));
  }

  protected toggle(): void {
    this.open.set(!this.open());
  }

  protected get hasActivity(): boolean {
    const p = this.progress();
    return !!p && (p.isRunning || p.remainingCount > 0);
  }
}
