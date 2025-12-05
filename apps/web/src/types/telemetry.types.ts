export type TelemetryConnectionState =
  | 'idle'
  | 'connecting'
  | 'live'
  | 'replay'
  | 'disconnected'
  | 'error';

export interface TelemetryPoint {
  telemetry_id?: string;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  battery_voltage?: number | null;
  rssi?: number | null;
  speed?: number | null;
  heading?: number | null;
  time?: string;
  recorded_at?: string;
  session_id?: string;
}

export interface TelemetryMetricStats {
  latest?: number | null;
  min?: number | null;
  max?: number | null;
  average?: number | null;
  unit?: string;
}

export interface TelemetryStatsSummary {
  altitude: TelemetryMetricStats;
  battery: TelemetryMetricStats;
  signal: TelemetryMetricStats;
  speed: TelemetryMetricStats;
  distance_meters: number;
}

export type TelemetryEventSeverity = 'info' | 'warning' | 'danger';

export interface TelemetryEventItem {
  id: string;
  timestamp: string;
  summary: string;
  details?: string;
  severity?: TelemetryEventSeverity;
  icon?: string;
}

export interface TelemetryState {
  missionId: string;
  sessionId?: string;
  points: TelemetryPoint[];
  stats: TelemetryStatsSummary;
  events: TelemetryEventItem[];
  latestPoint?: TelemetryPoint;
  connectionState: TelemetryConnectionState;
  error?: string | null;
  isMockStream?: boolean;
}
