export interface RawLogEntry {
  id: number;
  receivedAtUtc: string;
  serialNumber: string;
  endpoint: string;
  table: string | null;
  method: string;
  contentLength: number;
  isProcessed: boolean;
  processingError: string | null;
  bodyPreview: string;
  runtimeOnly: boolean;
}
