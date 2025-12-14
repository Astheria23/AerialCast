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
  snr?: number | null;
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
  snr: TelemetryMetricStats;
  speed: TelemetryMetricStats;
  distance_meters: number;
}

export type TelemetryEventSeverity = 'info' | 'warning' | 'danger';

export type AlertType = 'LOW_BATTERY' | 'GEOFENCE_BREACH' | 'SIGNAL_LOST' | 'MISSION_ERROR';

export interface MissionAlert {
  alert_id: string;
  session_id?: string | null;
  alert_type: AlertType;
  message?: string | null;
  timestamp: string;
}

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
  alerts: TelemetryEventItem[];
  latestPoint?: TelemetryPoint;
  connectionState: TelemetryConnectionState;
  error?: string | null;
}

export interface TelemetryReplayQuery {
  since?: string;
  until?: string;
  limit?: number;
  sampleEvery?: number;
}
