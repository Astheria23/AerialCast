import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { telemetryService } from '@/services/telemetry.service';
import type { MissionWaypoint } from '@/types/missions.types';
import type {
  TelemetryConnectionState,
  TelemetryEventItem,
  TelemetryPoint,
  TelemetryStatsSummary,
} from '@/types/telemetry.types';

interface UseTelemetryOptions {
  missionId: string;
  sessionId?: string;
  missionWaypoints?: MissionWaypoint[];
  mockStream?: boolean;
  fallbackToMock?: boolean;
  autoStart?: boolean;
  pollIntervalMs?: number;
}

interface UseTelemetryResult {
  points: TelemetryPoint[];
  latestPoint?: TelemetryPoint;
  stats: TelemetryStatsSummary;
  events: TelemetryEventItem[];
  connectionState: TelemetryConnectionState;
  error?: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isMockStream: boolean;
  activeSessionId?: string;
}

const DEFAULT_STATS: TelemetryStatsSummary = {
  altitude: { unit: 'm' },
  battery: { unit: 'V' },
  signal: { unit: 'dBm' },
  speed: { unit: 'm/s' },
  distance_meters: 0,
};

const randomId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const toRadians = (val: number) => (val * Math.PI) / 180;

const haversineDistance = (a: TelemetryPoint, b: TelemetryPoint) => {
  const R = 6371e3; // meters
  const φ1 = toRadians(a.latitude);
  const φ2 = toRadians(b.latitude);
  const Δφ = toRadians(b.latitude - a.latitude);
  const Δλ = toRadians(b.longitude - a.longitude);

  const h =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
};

const computeStats = (points: TelemetryPoint[]): TelemetryStatsSummary => {
  if (!points.length) {
    return DEFAULT_STATS;
  }

  const values = points.reduce(
    (acc, point) => {
      const { altitude, battery_voltage, rssi, speed } = point;
      if (typeof altitude === 'number') {
        acc.altitudes.push(altitude);
      }
      if (typeof battery_voltage === 'number') {
        acc.batteries.push(battery_voltage);
      }
      if (typeof rssi === 'number') {
        acc.signals.push(rssi);
      }
      if (typeof speed === 'number') {
        acc.speeds.push(speed);
      }
      return acc;
    },
    { altitudes: [] as number[], batteries: [] as number[], signals: [] as number[], speeds: [] as number[] }
  );

  const distance = points.slice(1).reduce((acc, point, index) => acc + haversineDistance(points[index], point), 0);

  const summarize = (series: number[], unit: string): TelemetryStatsSummary['altitude'] => ({
    unit,
    latest: series.at(-1) ?? null,
    min: series.length ? Math.min(...series) : null,
    max: series.length ? Math.max(...series) : null,
    average: series.length ? Number((series.reduce((sum, value) => sum + value, 0) / series.length).toFixed(2)) : null,
  });

  return {
    altitude: summarize(values.altitudes, 'm'),
    battery: summarize(values.batteries, 'V'),
    signal: summarize(values.signals, 'dBm'),
    speed: summarize(values.speeds, 'm/s'),
    distance_meters: Number(distance.toFixed(2)),
  };
};

const deriveEvents = (points: TelemetryPoint[]): TelemetryEventItem[] => {
  if (!points.length) return [];

  const latestPoints = points.slice(-12);
  return latestPoints
    .map((point, index) => {
      const summary = `Position update #${points.length - latestPoints.length + index + 1}`;
      const details = `Lat ${point.latitude.toFixed(4)}, Lng ${point.longitude.toFixed(4)} — Alt ${
        point.altitude?.toFixed(1) ?? '0'
      } m`;
      let severity: TelemetryEventItem['severity'] = 'info';
      if ((point.battery_voltage ?? 0) < 11.1) {
        severity = 'warning';
      }
      if ((point.battery_voltage ?? 0) < 10.6) {
        severity = 'danger';
      }
      return {
        id: point.telemetry_id ?? randomId(),
        timestamp: point.recorded_at ?? new Date().toISOString(),
        summary,
        details,
        severity,
      } satisfies TelemetryEventItem;
    })
    .reverse();
};

const buildMockPath = (missionWaypoints: MissionWaypoint[]): Array<{ latitude: number; longitude: number }> => {
  if (!missionWaypoints.length) {
    return [
      { latitude: -6.2017, longitude: 106.8142 },
      { latitude: -6.206, longitude: 106.817 },
      { latitude: -6.2108, longitude: 106.82 },
    ];
  }
  return [...missionWaypoints]
    .sort((a, b) => a.order - b.order)
    .map((waypoint) => ({ latitude: waypoint.latitude, longitude: waypoint.longitude }));
};

export function useTelemetry(options: UseTelemetryOptions): UseTelemetryResult {
  const {
    missionId,
    sessionId,
    missionWaypoints = [],
    autoStart = true,
    mockStream = false,
    fallbackToMock = true,
    pollIntervalMs = 5000,
  } = options;
  const [points, setPoints] = useState<TelemetryPoint[]>([]);
  const [connectionState, setConnectionState] = useState<TelemetryConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cursorRef = useRef(0);
  const [isMockMode, setIsMockMode] = useState<boolean>(mockStream);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(sessionId);
  const mockPath = useMemo(() => buildMockPath(missionWaypoints), [missionWaypoints]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearTimer();
    cursorRef.current = 0;
    setConnectionState((prev) => (prev === 'error' ? prev : 'disconnected'));
  }, [clearTimer]);

  const pushPoint = useCallback((point: TelemetryPoint) => {
    setPoints((prev) => {
      const next = [...prev, point];
      if (next.length > 240) {
        next.shift();
      }
      return next;
    });
  }, []);

  const buildMockPoint = useCallback((): TelemetryPoint => {
    const index = cursorRef.current;
    cursorRef.current += 1;
    const from = mockPath[index % mockPath.length];
    const to = mockPath[(index + 1) % mockPath.length];
    const ratio = (index % 20) / 20;
    const latitude = from.latitude + (to.latitude - from.latitude) * ratio + (Math.random() - 0.5) * 0.0005;
    const longitude = from.longitude + (to.longitude - from.longitude) * ratio + (Math.random() - 0.5) * 0.0005;
    const altitude = 40 + Math.sin(index / 4) * 6 + Math.random() * 3;
    const baseBattery = 12.6;
    const drained = baseBattery - index * 0.02;
    const battery_voltage = clamp(Number(drained.toFixed(2)), 10.3, 12.6);
    const rssi = -45 - index * 0.2 + Math.random() * 4;
    const speed = 8 + Math.random() * 3;
    const heading = (index * 15) % 360;
    return {
      telemetry_id: randomId(),
      latitude,
      longitude,
      altitude: Number(altitude.toFixed(2)),
      battery_voltage,
      rssi: Number(rssi.toFixed(0)),
      speed: Number(speed.toFixed(2)),
      heading,
      recorded_at: new Date().toISOString(),
    } satisfies TelemetryPoint;
  }, [mockPath]);

  const startMockStream = useCallback(() => {
    clearTimer();
    setIsMockMode(true);
    setActiveSessionId(undefined);
    cursorRef.current = Math.floor(Math.random() * 5);
    setPoints(telemetryService.generateMockTrail(missionWaypoints, 10));
    setConnectionState('live');
    timerRef.current = setInterval(() => {
      const point = buildMockPoint();
      pushPoint(point);
    }, 2000);
  }, [buildMockPoint, clearTimer, missionWaypoints, pushPoint]);

  const startLivePolling = useCallback(
    async (resolvedSessionId: string) => {
      clearTimer();
      setIsMockMode(false);
      setActiveSessionId(resolvedSessionId);
      const initial = await telemetryService.getSessionReplay(resolvedSessionId);
      setPoints(initial ?? []);
      setConnectionState('live');
      timerRef.current = setInterval(async () => {
        try {
          const fresh = await telemetryService.getSessionReplay(resolvedSessionId);
          setPoints(fresh ?? []);
        } catch (pollError) {
          console.error('Telemetry poll error', pollError);
          const message =
            pollError instanceof Error ? pollError.message : 'Failed to refresh telemetry data';
          setError(message);
          setConnectionState('error');
        }
      }, pollIntervalMs);
    },
    [clearTimer, pollIntervalMs]
  );

  const connect = useCallback(async () => {
    setError(null);
    setConnectionState('connecting');
    if (mockStream) {
      startMockStream();
      return;
    }

    try {
      const resolvedSessionId =
        sessionId ?? (await telemetryService.getLatestSessionForMission(missionId))?.session_id;
      if (!resolvedSessionId) {
        if (fallbackToMock) {
          startMockStream();
        } else {
          setConnectionState('disconnected');
          setError('No flight session available yet for this mission.');
        }
        return;
      }
      await startLivePolling(resolvedSessionId);
    } catch (err) {
      console.error('Telemetry connection error', err);
      const message = err instanceof Error ? err.message : 'Failed to connect to telemetry stream';
      setError(message);
      setConnectionState('error');
      if (fallbackToMock) {
        startMockStream();
      }
    }
  }, [fallbackToMock, missionId, mockStream, sessionId, startLivePolling, startMockStream]);

  useEffect(() => {
    if (!autoStart) return undefined;
    let active = true;
    const start = async () => {
      await Promise.resolve();
      if (active) {
        await connect();
      }
    };
    void start();
    return () => {
      active = false;
      disconnect();
    };
  }, [autoStart, connect, disconnect]);

  const stats = useMemo(() => computeStats(points), [points]);
  const events = useMemo(() => deriveEvents(points), [points]);
  const latestPoint = points.at(-1);

  return {
    points,
    latestPoint,
    stats,
    events,
    connectionState,
    error,
    connect,
    disconnect,
    isMockStream: isMockMode,
    activeSessionId,
  } satisfies UseTelemetryResult;
}
