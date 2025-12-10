import api from '@/lib/axios';
import type { FlightSession, SessionStatus } from '@/types/sessions.types';
import type { TelemetryPoint, TelemetryReplayQuery } from '@/types/telemetry.types';

const SESSIONS_ENDPOINT = 'api/v1/sessions';
const MAX_POINTS = 240;

const EARTH_RADIUS_M = 6371000;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const haversineDistance = (a: TelemetryPoint, b: TelemetryPoint) => {
  const φ1 = toRadians(a.latitude);
  const φ2 = toRadians(b.latitude);
  const Δφ = toRadians(b.latitude - a.latitude);
  const Δλ = toRadians(b.longitude - a.longitude);

  const sinHalfΔφ = Math.sin(Δφ / 2);
  const sinHalfΔλ = Math.sin(Δλ / 2);
  const h = sinHalfΔφ * sinHalfΔφ + Math.cos(φ1) * Math.cos(φ2) * sinHalfΔλ * sinHalfΔλ;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_M * c;
};

type ApiTelemetryPoint = {
  telemetry_id?: string;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  battery_voltage?: number | null;
  rssi?: number | null;
  snr?: number | null;
  speed?: number | null;
  heading?: number | null;
  recorded_at?: string;
  time?: string;
  session_id?: string;
};

type SessionListQuery = {
  missionId?: string;
  statuses?: SessionStatus[];
  limit?: number;
};

type MissionSessionQuery = Omit<SessionListQuery, 'missionId'>;

const normalizeTelemetryPoints = (points: ApiTelemetryPoint[]): TelemetryPoint[] => {
  const normalized = points.map((point, index) => {
    const recorded_at = point.recorded_at ?? point.time ?? new Date().toISOString();
    const fallbackId = `${point.session_id ?? 'session'}-${recorded_at}-${index}-${point.latitude}-${point.longitude}`;
    return {
      ...point,
      telemetry_id: point.telemetry_id ?? fallbackId,
      recorded_at,
    } satisfies TelemetryPoint;
  });

  for (let i = 1; i < normalized.length; i += 1) {
    const current = normalized[i];
    const previous = normalized[i - 1];
    if (typeof current.speed === 'number') {
      continue;
    }
    const prevTime = previous.recorded_at ?? previous.time;
    const currTime = current.recorded_at ?? current.time;
    if (!prevTime || !currTime) {
      continue;
    }
    const prevTs = Date.parse(prevTime);
    const currTs = Date.parse(currTime);
    if (!Number.isFinite(prevTs) || !Number.isFinite(currTs)) {
      continue;
    }
    const deltaSeconds = (currTs - prevTs) / 1000;
    if (deltaSeconds <= 0) {
      continue;
    }
    const distance = haversineDistance(previous, current);
    if (!Number.isFinite(distance)) {
      continue;
    }
    current.speed = Number((distance / deltaSeconds).toFixed(2));
  }

  return normalized.slice(-MAX_POINTS);
};

const buildSessionQuery = (params: SessionListQuery = {}) => {
  const search = new URLSearchParams();
  if (params.missionId) {
    search.set('mission_id', params.missionId);
  }
  if (params.statuses && params.statuses.length) {
    search.set('status', params.statuses.join(','));
  }
  if (params.limit) {
    search.set('limit', String(params.limit));
  }
  return search;
};

const fetchSessions = async (params: SessionListQuery = {}) => {
  const query = buildSessionQuery(params).toString();
  const url = query ? `${SESSIONS_ENDPOINT}?${query}` : SESSIONS_ENDPOINT;
  const response = await api.get<FlightSession[]>(url);
  return response.data;
};

const buildReplayQuery = (params: TelemetryReplayQuery = {}) => {
  const search = new URLSearchParams();
  if (params.since) {
    search.set('since', params.since);
  }
  if (params.until) {
    search.set('until', params.until);
  }
  if (params.limit) {
    search.set('limit', String(params.limit));
  }
  if (params.sampleEvery) {
    search.set('sample_every', String(params.sampleEvery));
  }
  return search;
};

export const telemetryService = {
  async getSessionReplay(sessionId: string, params: TelemetryReplayQuery = {}) {
    const query = buildReplayQuery(params).toString();
    const url = query
      ? `${SESSIONS_ENDPOINT}/${sessionId}/replay?${query}`
      : `${SESSIONS_ENDPOINT}/${sessionId}/replay`;
    const response = await api.get<ApiTelemetryPoint[]>(url);
    return normalizeTelemetryPoints(response.data);
  },

  getSessions: fetchSessions,

  async getMissionSessions(missionId: string, params: MissionSessionQuery = {}) {
    return fetchSessions({ missionId, ...params });
  },

  async getLatestSessionForMission(missionId: string) {
    const sessions = await fetchSessions({ missionId, limit: 10 });
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

  normalizeTelemetryPoints,
};
