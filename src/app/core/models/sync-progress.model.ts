export interface SyncProgressLastBatch {
  pending: number;
  mapped: number;
  affected: number;
  skipped: number;
  excluded: number;
}

export interface SyncProgress {
  isRunning: boolean;
  remainingCount: number;
  totalSyncedSinceStartup: number;
  totalFailedSinceStartup: number;
  lastRunStartedAtUtc: string | null;
  lastRunCompletedAtUtc: string | null;
  lastBatch: SyncProgressLastBatch;
  lastError: string | null;
}
