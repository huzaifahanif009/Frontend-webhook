export interface AdmsDevice {
  serialNumber: string;
  firstSeenUtc: string;
  lastSeenUtc: string;
  lastHeartbeatUtc: string | null;
  lastAttendanceUtc: string | null;
  lastRegistryUtc: string | null;
  lastOperLogUtc: string | null;
  lastKnownIp: string | null;
  pushVersion: string | null;
  deviceType: string | null;
  firmwareVersion: string | null;
  lastTable: string | null;
  isRegistered: boolean;
  erpDeviceId: number | null;
  registeredMachineIp: string | null;
  registeredAtUtc: string | null;
  lastRegistrySyncUtc: string | null;
  syncEnabled: boolean;
  clientName: string | null;
  entityName: string | null;
  protocol: string | null;
}

export interface DeviceConnectionStatusItem {
  serialNumber: string;
  erpDeviceId: number | null;
  registeredMachineIp: string | null;
  lastKnownIp: string | null;
  isOnline: boolean;
  lastActivityUtc: string;
  lastHeartbeatUtc: string | null;
  lastSeenUtc: string;
  lastAttendanceUtc: string | null;
  registeredAtUtc: string | null;
  lastRegistrySyncUtc: string | null;
}

export interface DeviceConnectionStatusResponse {
  checkedAtUtc: string;
  onlineWindowSeconds: number;
  registeredDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  items: DeviceConnectionStatusItem[];
}

/** A device row merged with its connection status for the Devices screen table. */
export interface DeviceRow extends AdmsDevice {
  isOnline: boolean | null;
  lastActivityUtc: string | null;
}

export interface SetDeviceSyncResponse {
  serialNumber: string;
  syncEnabled: boolean;
}

/** Mirrors RequestAttlogRequest on the backend. */
export interface RequestAttlogRequest {
  fromUtc: string;
  toUtc: string;
}

export interface RequestAttlogResponse {
  message: string;
  commandId: number | null;
}
