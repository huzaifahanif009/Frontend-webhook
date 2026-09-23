import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LogsService } from '../../core/services/logs.service';
import { RawLogEntry } from '../../core/models/logs.model';

@Component({
  selector: 'app-logs',
  imports: [FormsModule],
  templateUrl: './logs.html',
  styleUrl: './logs.scss'
})
export class Logs implements OnInit {
  private readonly logsService = inject(LogsService);

  protected readonly logs = signal<RawLogEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly take = signal(200);
  protected readonly search = signal('');
  protected readonly endpointFilter = signal('all');
  protected readonly errorsOnly = signal(false);

  protected readonly endpoints = computed(() => {
    const set = new Set(this.logs().map((log) => log.endpoint));
    return Array.from(set).sort();
  });

  protected readonly filteredLogs = computed(() => {
    const search = this.search().trim().toLowerCase();
    const endpoint = this.endpointFilter();
    const errorsOnly = this.errorsOnly();

    return this.logs().filter((log) => {
      if (errorsOnly && !log.processingError) {
        return false;
      }
      if (endpoint !== 'all' && log.endpoint !== endpoint) {
        return false;
      }
      if (!search) {
        return true;
      }
      const haystack = `${log.serialNumber} ${log.endpoint} ${log.table ?? ''}`.toLowerCase();
      return haystack.includes(search);
    });
  });

  ngOnInit(): void {
    this.refresh();
  }

  protected refresh(): void {
    this.loading.set(true);
    this.error.set(null);

    this.logsService.getRecentLogs(this.take()).subscribe({
      next: (logs) => {
        this.logs.set(logs);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load raw logs.');
        this.loading.set(false);
      }
    });
  }
}
