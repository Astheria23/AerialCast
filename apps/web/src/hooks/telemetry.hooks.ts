import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { alertService } from '@/services/alert.service';
import { telemetryService } from '@/services/telemetry.service';
import type {
  TelemetryConnectionState,
  TelemetryEventItem,
  TelemetryPoint,
  TelemetryStatsSummary,
  MissionAlert,
} from '@/types/telemetry.types';

interface UseTelemetryOptions {
  missionId: string;
  sessionId?: string;
  autoStart?: boolean;
  pollIntervalMs?: number;
}

interface UseTelemetryResult {
  points: TelemetryPoint[];
  latestPoint?: TelemetryPoint;
  stats: TelemetryStatsSummary;
  events: TelemetryEventItem[];
  alerts: TelemetryEventItem[];
  connectionState: TelemetryConnectionState;
  error?: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  activeSessionId?: string;
}

const DEFAULT_STATS: TelemetryStatsSummary = {
  altitude: { unit: 'm' },
  battery: { unit: 'V' },
  signal: { unit: 'dBm' },
  snr: { unit: 'dB' },
  speed: { unit: 'm/s' },
  distance_meters: 0,
};

const ALERT_HISTORY_LIMIT = 80;

const titleCase = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const ALERT_METADATA: Record<MissionAlert['alert_type'], { label: string; severity: TelemetryEventItem['severity'] }> = {
  LOW_BATTERY: {
    label: 'Low battery warning',
    severity: 'warning',
  },
  SIGNAL_LOST: {
    label: 'Signal link lost',
    severity: 'danger',
  },
  GEOFENCE_BREACH: {
    label: 'Geofence breach detected',
    severity: 'danger',
  },
  MISSION_ERROR: {
    label: 'Mission error reported',
    severity: 'danger',
  },
};

const buildAlertEvents = (alerts: MissionAlert[]): TelemetryEventItem[] => {
  if (!alerts.length) {
    return [];
  }

  return alerts
    .slice(0, ALERT_HISTORY_LIMIT)
    .map((alert) => {
      const meta = ALERT_METADATA[alert.alert_type] ?? {
        label: titleCase(alert.alert_type),
        severity: 'warning' as TelemetryEventItem['severity'],
      };
      const message = alert.message?.trim();
      return {
        id: alert.alert_id,
        timestamp: alert.timestamp ?? new Date().toISOString(),
        summary: message || meta.label,
        details: message ? meta.label : undefined,
        severity: meta.severity,
      } satisfies TelemetryEventItem;
    })
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
};

const randomId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

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

export const computeStats = (points: TelemetryPoint[]): TelemetryStatsSummary => {
  if (!points.length) {
    return DEFAULT_STATS;
  }

  const values = points.reduce(
    (acc, point) => {
      const { altitude, battery_voltage, rssi, snr, speed } = point;
      if (typeof altitude === 'number') {
        acc.altitudes.push(altitude);
      }
      if (typeof battery_voltage === 'number') {
        acc.batteries.push(battery_voltage);
      }
      if (typeof rssi === 'number') {
        acc.signals.push(rssi);
      }
      if (typeof snr === 'number') {
        acc.qualities.push(snr);
      }
      if (typeof speed === 'number') {
        acc.speeds.push(speed);
      }
      return acc;
    },
    {
      altitudes: [] as number[],
      batteries: [] as number[],
      signals: [] as number[],
      qualities: [] as number[],
      speeds: [] as number[],
    }
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
    snr: summarize(values.qualities, 'dB'),
    speed: summarize(values.speeds, 'm/s'),
    distance_meters: Number(distance.toFixed(2)),
  };
};

export const deriveEvents = (points: TelemetryPoint[]): TelemetryEventItem[] => {
  if (!points.length) return [];

  const latestPoints = points.slice(-12);
  return latestPoints
    .map((point, index) => {
      const summary = `Position update #${points.length - latestPoints.length + index + 1}`;
      const parts = [
        `Lat ${point.latitude.toFixed(4)}`,
        `Lng ${point.longitude.toFixed(4)}`,
        `Alt ${point.altitude?.toFixed(1) ?? '0'} m`,
      ];
      if (typeof point.rssi === 'number') {
        parts.push(`RSSI ${point.rssi} dBm`);
      }
      if (typeof point.snr === 'number') {
        parts.push(`SNR ${point.snr.toFixed(1)} dB`);
      }
      const details = parts.join(' • ');
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

export function useTelemetry(options: UseTelemetryOptions): UseTelemetryResult {
  const { missionId, sessionId, autoStart = true, pollIntervalMs = 5000 } = options;
  const [points, setPoints] = useState<TelemetryPoint[]>([]);
  const [rawAlerts, setRawAlerts] = useState<MissionAlert[]>([]);
  const [connectionState, setConnectionState] = useState<TelemetryConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(sessionId);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fetchAlerts = useCallback(
    async (resolvedSessionId: string) => {
      try {
        const entries = await alertService.listBySession(resolvedSessionId, {
          limit: ALERT_HISTORY_LIMIT,
        });
        setRawAlerts(entries ?? []);
      } catch (alertError) {
        console.warn('Alert poll error', alertError);
      }
    },
    []
  );

  const disconnect = useCallback(() => {
    clearTimer();
    setRawAlerts([]);
    setConnectionState((prev) => (prev === 'error' ? prev : 'disconnected'));
  }, [clearTimer]);

  const startLivePolling = useCallback(
    async (resolvedSessionId: string) => {
      clearTimer();
      setActiveSessionId(resolvedSessionId);
      const initial = await telemetryService.getSessionReplay(resolvedSessionId);
      setPoints(initial ?? []);
      setConnectionState('live');
      await fetchAlerts(resolvedSessionId);

      const poll = async () => {
        try {
          const fresh = await telemetryService.getSessionReplay(resolvedSessionId);
          setPoints(fresh ?? []);
        } catch (pollError) {
          console.error('Telemetry poll error', pollError);
          const message =
            pollError instanceof Error ? pollError.message : 'Failed to refresh telemetry data';
          setError(message);
          setConnectionState('error');
          clearTimer();
          return;
        }

        await fetchAlerts(resolvedSessionId);
      };

      timerRef.current = setInterval(() => {
        void poll();
      }, pollIntervalMs);
    },
    [clearTimer, fetchAlerts, pollIntervalMs]
  );

  const connect = useCallback(async () => {
    setError(null);
    setConnectionState('connecting');
    try {
      const resolvedSessionId =
        sessionId ?? (await telemetryService.getLatestSessionForMission(missionId))?.session_id;
      if (!resolvedSessionId) {
        setConnectionState('disconnected');
        setActiveSessionId(undefined);
        setPoints([]);
        setRawAlerts([]);
        setError('No flight session available yet for this mission.');
        return;
      }
      await startLivePolling(resolvedSessionId);
    } catch (err) {
      console.error('Telemetry connection error', err);
      const message = err instanceof Error ? err.message : 'Failed to connect to telemetry stream';
      setError(message);
      setConnectionState('error');
      setRawAlerts([]);
      clearTimer();
    }
  }, [clearTimer, missionId, sessionId, startLivePolling]);

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
  const telemetryEvents = useMemo(() => deriveEvents(points), [points]);
  const alertEvents = useMemo(() => buildAlertEvents(rawAlerts), [rawAlerts]);
  const events = useMemo(() => {
    if (!alertEvents.length) {
      return telemetryEvents;
    }
    if (!telemetryEvents.length) {
      return alertEvents;
    }
    return [...alertEvents, ...telemetryEvents].sort(
      (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)
    );
  }, [alertEvents, telemetryEvents]);
  const latestPoint = points.at(-1);

  return {
    points,
    latestPoint,
    stats,
    events,
    alerts: alertEvents,
    connectionState,
    error,
    connect,
    disconnect,
    activeSessionId,
  } satisfies UseTelemetryResult;
}
