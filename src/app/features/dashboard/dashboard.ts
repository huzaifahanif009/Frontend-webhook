import { DatePipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Chart, registerables } from 'chart.js';
import { EMPTY, catchError, forkJoin, interval, of, startWith, switchMap } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { AttendanceService } from '../../core/services/attendance.service';
import { DashboardSummary } from '../../core/models/dashboard.model';
import { AttendanceRow } from '../../core/models/attendance.model';

Chart.register(...registerables);

const SUMMARY_REFRESH_MS = 15000;
const TREND_REFRESH_MS = 60000;
const TREND_DAYS = 7;

interface RecentRowView {
  row: AttendanceRow;
  label: string;
  cssClass: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit, AfterViewInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  @ViewChild('trendCanvas') private trendCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('deviceCanvas') private deviceCanvasRef?: ElementRef<HTMLCanvasElement>;

  private trendChart?: Chart;
  private deviceChart?: Chart;

  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly lastUpdated = signal<Date | null>(null);

  protected readonly recentRows = signal<RecentRowView[]>([]);
  protected readonly recentLoading = signal(true);

  protected readonly syncing = signal(false);
  protected readonly syncMessage = signal<string | null>(null);

  ngOnInit(): void {
    interval(SUMMARY_REFRESH_MS)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.dashboardService.getSummary().pipe(
            catchError(() => {
              this.error.set('Could not load dashboard summary.');
              this.loading.set(false);
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((summary) => {
        this.summary.set(summary);
        this.error.set(null);
        this.loading.set(false);
        this.lastUpdated.set(new Date());
        this.updateDeviceChart(summary);
      });

    interval(TREND_REFRESH_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.loadTrend()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((counts) => this.updateTrendChart(counts));

    this.attendanceService
      .search({ take: 6, skip: 0 })
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        this.recentRows.set((res?.items ?? []).map((row) => ({ row, ...this.statusOf(row) })));
        this.recentLoading.set(false);
      });
  }

  ngAfterViewInit(): void {
    if (this.trendCanvasRef) {
      this.trendChart = new Chart(this.trendCanvasRef.nativeElement, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Attendance',
              data: [],
              borderColor: '#4f46e5',
              backgroundColor: 'rgba(79, 70, 229, 0.08)',
              borderWidth: 2,
              tension: 0.35,
              fill: true,
              pointRadius: 0,
              pointHoverRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#8890a6', font: { size: 11 } } },
            y: {
              beginAtZero: true,
              grid: { color: '#eef0f6' },
              ticks: { color: '#8890a6', font: { size: 11 }, precision: 0 }
            }
          }
        }
      });
    }

    if (this.deviceCanvasRef) {
      this.deviceChart = new Chart(this.deviceCanvasRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Online', 'Offline', 'Unregistered'],
          datasets: [
            {
              data: [0, 0, 0],
              backgroundColor: ['#16a34a', '#dc2626', '#94a3b8'],
              borderWidth: 0,
              hoverOffset: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, color: '#4b5065', font: { size: 11.5 } }
            }
          }
        }
      });

      const current = this.summary();
      if (current) {
        this.updateDeviceChart(current);
      }
    }
  }

  protected syncNow(): void {
    this.syncing.set(true);
    this.syncMessage.set(null);

    this.attendanceService.runSyncNow().subscribe({
      next: (result) => {
        this.syncing.set(false);
        this.syncMessage.set(result.message);
      },
      error: (err) => {
        this.syncing.set(false);
        this.syncMessage.set(err?.error?.detail ?? err?.error?.message ?? 'Could not run ERP sync.');
      }
    });
  }

  protected goTo(path: string): void {
    this.router.navigate([path]);
  }

  private loadTrend() {
    const days = Array.from({ length: TREND_DAYS }, (_, i) => {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - (TREND_DAYS - 1 - i));
      const from = new Date(date);
      const to = new Date(date);
      to.setUTCDate(to.getUTCDate() + 1);
      return { label: from.toLocaleDateString(undefined, { weekday: 'short' }), from, to };
    });

    return forkJoin(
      days.map((day) =>
        this.attendanceService
          .search({
            take: 1,
            skip: 0,
            fromUtc: day.from.toISOString(),
            toUtc: day.to.toISOString()
          })
          .pipe(catchError(() => of({ total: 0, take: 1, skip: 0, items: [] })))
      )
    ).pipe(
      switchMap((responses) =>
        of(days.map((day, i) => ({ label: day.label, count: responses[i]?.total ?? 0 })))
      )
    );
  }

  private updateTrendChart(counts: { label: string; count: number }[]): void {
    if (!this.trendChart) {
      return;
    }
    this.trendChart.data.labels = counts.map((c) => c.label);
    this.trendChart.data.datasets[0].data = counts.map((c) => c.count);
    this.trendChart.update();
  }

  private updateDeviceChart(summary: DashboardSummary): void {
    if (!this.deviceChart) {
      return;
    }
    this.deviceChart.data.datasets[0].data = [
      summary.onlineDevices,
      summary.offlineDevices,
      summary.unregisteredSeenDevices
    ];
    this.deviceChart.update();
  }

  private statusOf(row: AttendanceRow): { label: string; cssClass: string } {
    if (row.erpSyncedAtUtc) {
      return { label: 'Synced', cssClass: 'badge-success' };
    }
    if (row.erpSyncSkippedAtUtc) {
      const isFailure = row.erpSyncSkipReason === 'MAPPING_ERROR';
      return { label: isFailure ? 'Failed' : 'Skipped', cssClass: isFailure ? 'badge-danger' : 'badge-muted' };
    }
    return { label: 'Pending', cssClass: 'badge-warning' };
  }
}
