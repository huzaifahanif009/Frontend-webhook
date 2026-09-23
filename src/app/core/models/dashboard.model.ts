export interface DashboardSummary {
  registeredDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  onlineWindowSeconds: number;
  unregisteredSeenDevices: number;
  totalDevices: number;
  rawLogsToday: number;
  attendanceToday: number;
  queuedCommands: number;
  pendingErpSync: number;
}
