import { ISODateTimeString, UUID } from './common';

export interface TelemetryPoint {
  telemetry_id?: UUID;
  time?: ISODateTimeString;
  session_id: UUID;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  battery_voltage?: number | null;
  rssi?: number | null;
  drone_id?: UUID;
  mission_id?: UUID | null;
}
