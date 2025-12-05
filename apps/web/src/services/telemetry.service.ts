import api from '@/lib/axios';
import type { MissionWaypoint } from '@/types/missions.types';
import type { FlightSession } from '@/types/sessions.types';
import type { TelemetryPoint } from '@/types/telemetry.types';

const SESSIONS_ENDPOINT = 'api/v1/sessions';
const MAX_POINTS = 240;

const randomId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

type ApiTelemetryPoint = {
  telemetry_id?: string;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  battery_voltage?: number | null;
  rssi?: number | null;
  speed?: number | null;
  heading?: number | null;
  recorded_at?: string;
  time?: string;
  session_id?: string;
};

const normalizeTelemetryPoints = (points: ApiTelemetryPoint[]): TelemetryPoint[] => {
  return points
    .map((point, index) => {
      const recorded_at = point.recorded_at ?? point.time ?? new Date().toISOString();
      const fallbackId = `${point.session_id ?? 'session'}-${recorded_at}-${index}-${point.latitude}-${point.longitude}`;
      return {
        ...point,
        telemetry_id: point.telemetry_id ?? fallbackId,
        recorded_at,
      } satisfies TelemetryPoint;
    })
    .slice(-MAX_POINTS);
};

export const telemetryService = {
  async getSessionReplay(sessionId: string) {
    const response = await api.get<ApiTelemetryPoint[]>(`${SESSIONS_ENDPOINT}/${sessionId}/replay`);
    return normalizeTelemetryPoints(response.data);
  },

  async getSessions() {
    const response = await api.get<FlightSession[]>(SESSIONS_ENDPOINT);
    return response.data;
  },

  async getLatestSessionForMission(missionId: string) {
    const sessions = await this.getSessions();
    const relevant = sessions.filter((session) => session.mission_id === missionId);
    if (!relevant.length) {
      return null;
    }
    const rank = (status?: string | null) => {
      if (status === 'LIVE') return 2;
      if (status === 'COMPLETED') return 1;
      return 0;
    };
    return relevant.sort((a, b) => {
      const rankDiff = rank(b.status) - rank(a.status);
      if (rankDiff !== 0) return rankDiff;
      const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
      const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
      return bTime - aTime;
    })[0];
  },

  generateMockTrail(waypoints: MissionWaypoint[] = [], length = 40): TelemetryPoint[] {
    const ordered = [...waypoints].sort((a, b) => a.order - b.order);
    const sourcePath = ordered.length ? ordered : [{ latitude: -6.2, longitude: 106.8167, order: 0 }];

    const points: TelemetryPoint[] = [];
    for (let i = 0; i < length; i += 1) {
      const from = sourcePath[i % sourcePath.length];
      const to = sourcePath[(i + 1) % sourcePath.length] || from;
      const ratio = (i % 10) / 10;
      const latitude = from.latitude + (to.latitude - from.latitude) * ratio + (Math.random() - 0.5) * 0.0008;
      const longitude = from.longitude + (to.longitude - from.longitude) * ratio + (Math.random() - 0.5) * 0.0008;
      const altitude = 40 + Math.sin(i / 5) * 8 + Math.random() * 3;
      const battery_voltage = 12.6 - i * 0.05 + Math.random() * 0.02;
      const rssi = -50 - i + Math.random() * 5;
      const speed = 8 + Math.random() * 3;
      const heading = (i * 12) % 360;
      points.push({
        telemetry_id: randomId(),
        latitude,
        longitude,
        altitude,
        battery_voltage,
        rssi,
        speed,
        heading,
        recorded_at: new Date(Date.now() - (length - i) * 1000).toISOString(),
      });
    }
    return points.slice(-MAX_POINTS);
  },

  normalizeTelemetryPoints,
};
