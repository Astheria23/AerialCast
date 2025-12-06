import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getFriendlyErrorMessage } from '@/lib/errors';
import { telemetryService } from '@/services/telemetry.service';
import type { FlightSession, SessionStatus } from '@/types/sessions.types';
import type {
  TelemetryEventItem,
  TelemetryPoint,
  TelemetryReplayQuery,
  TelemetryStatsSummary,
} from '@/types/telemetry.types';
import { computeStats, deriveEvents } from '@/hooks/telemetry.hooks';

const clampIndex = (value: number, length: number) => {
  if (length <= 0) return 0;
  if (length === 1) return 0;
  return Math.min(Math.max(value, 0), length - 1);
};

const toMillis = (point?: TelemetryPoint | null) => {
  if (!point) return null;
  const iso = point.recorded_at ?? point.time;
  if (!iso) return null;
  const ts = Date.parse(iso);
  return Number.isNaN(ts) ? null : ts;
};

export type MissionReplayOptions = {
  missionId: string;
  autoLoadSessions?: boolean;
  defaultStatuses?: SessionStatus[];
  sessionLimit?: number;
  autoSelectLatest?: boolean;
  autoLoadReplay?: boolean;
};

export type MissionSessionQuery = {
  statuses?: SessionStatus[];
  limit?: number;
};

export type ReplayPlaybackState = {
  isPlaying: boolean;
  speed: number;
  cursorIndex: number;
  progress: number;
  durationMs: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setSpeed: (speed: number) => void;
  seekToIndex: (index: number) => void;
  seekToProgress: (progress: number) => void;
  seekToTime: (iso: string) => void;
};

export type UseMissionReplayResult = {
  sessions: FlightSession[];
  sessionsLoading: boolean;
  replayLoading: boolean;
  error: string | null;
  selectedSessionId?: string;
  selectedSession?: FlightSession;
  replayPoints: TelemetryPoint[];
  currentPoint?: TelemetryPoint;
  nextPoint?: TelemetryPoint;
  stats: TelemetryStatsSummary;
  events: TelemetryEventItem[];
  playback: ReplayPlaybackState;
  timeline?: { start: number; end: number; durationMs: number } | null;
  loadSessions: (query?: MissionSessionQuery) => Promise<FlightSession[]>;
  loadReplay: (sessionId: string, params?: TelemetryReplayQuery) => Promise<TelemetryPoint[]>;
  selectSession: (
    sessionId: string,
    options?: { autoLoad?: boolean; replayParams?: TelemetryReplayQuery }
  ) => Promise<void>;
};

export const useMissionReplay = (options: MissionReplayOptions): UseMissionReplayResult => {
  const {
    missionId,
    autoLoadSessions = true,
    defaultStatuses,
    sessionLimit,
    autoSelectLatest = true,
    autoLoadReplay = true,
  } = options;

  const defaultStatusesKey = defaultStatuses?.join(',') ?? '';
  const defaultStatusesRef = useRef<SessionStatus[] | undefined>(defaultStatuses);
  useEffect(() => {
    defaultStatusesRef.current = defaultStatuses;
  }, [defaultStatuses, defaultStatusesKey]);

  const [sessions, setSessions] = useState<FlightSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [replayLoading, setReplayLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(undefined);
  const [replayPoints, setReplayPoints] = useState<TelemetryPoint[]>([]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPlaybackTimer = useCallback(() => {
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearPlaybackTimer, [clearPlaybackTimer]);

  const loadReplay = useCallback(
    async (sessionId: string, params: TelemetryReplayQuery = {}) => {
      setReplayLoading(true);
      setError(null);
      try {
        const points = await telemetryService.getSessionReplay(sessionId, params);
        setReplayPoints(points);
        setSelectedSessionId(sessionId);
        setCursorIndex(0);
        setIsPlaying(false);
        return points;
      } catch (err) {
        const message = getFriendlyErrorMessage(err, 'Failed to load telemetry replay');
        setError(message);
        throw err;
      } finally {
        setReplayLoading(false);
      }
    },
    []
  );

  const loadSessions = useCallback(
    async (query?: MissionSessionQuery) => {
      if (!missionId) {
        setSessions([]);
        setSelectedSessionId(undefined);
        return [];
      }
      setSessionsLoading(true);
      setError(null);
      try {
        const pointsQuery: MissionSessionQuery = {
          statuses: query?.statuses ?? defaultStatusesRef.current,
          limit: query?.limit ?? sessionLimit,
        };
        const data = await telemetryService.getMissionSessions(missionId, pointsQuery);
        setSessions(data);
        if (data.length === 0) {
          setSelectedSessionId(undefined);
          setReplayPoints([]);
          setCursorIndex(0);
          setIsPlaying(false);
          return data;
        }
        if (autoSelectLatest) {
          const latestSessionId = data[0].session_id;
          setSelectedSessionId(latestSessionId);
          if (autoLoadReplay) {
            await loadReplay(latestSessionId);
          } else {
            setCursorIndex(0);
            setIsPlaying(false);
          }
        }
        return data;
      } catch (err) {
        const message = getFriendlyErrorMessage(err, 'Failed to load mission sessions');
        setError(message);
        throw err;
      } finally {
        setSessionsLoading(false);
      }
    },
    [
      autoLoadReplay,
      autoSelectLatest,
      loadReplay,
      missionId,
      sessionLimit,
    ]
  );

  useEffect(() => {
    if (!autoLoadSessions) return;
    loadSessions().catch(() => null);
  }, [autoLoadSessions, defaultStatusesKey, loadSessions]);

  useEffect(() => {
    if (cursorIndex >= replayPoints.length && replayPoints.length) {
      setCursorIndex(replayPoints.length - 1);
    }
  }, [cursorIndex, replayPoints.length]);

  useEffect(() => {
    if (!isPlaying || replayPoints.length <= 1) {
      clearPlaybackTimer();
      return;
    }
    clearPlaybackTimer();
    const intervalMs = Math.max(100, 1000 / playbackSpeed);
    playbackTimerRef.current = setInterval(() => {
      setCursorIndex((prev) => {
        const next = prev + 1;
        if (next >= replayPoints.length) {
          clearPlaybackTimer();
          setIsPlaying(false);
          return prev;
        }
        return next;
      });
    }, intervalMs);
    return clearPlaybackTimer;
  }, [clearPlaybackTimer, isPlaying, playbackSpeed, replayPoints.length]);

  const play = useCallback(() => {
    if (replayPoints.length > 1) {
      setIsPlaying(true);
    }
  }, [replayPoints.length]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    setIsPlaying((prev) => {
      if (prev) {
        return false;
      }
      return replayPoints.length > 1;
    });
  }, [replayPoints.length]);

  const updateSpeed = useCallback((speed: number) => {
    const bounded = Math.min(Math.max(speed, 0.25), 6);
    setPlaybackSpeed(bounded);
  }, []);

  const seekToIndex = useCallback(
    (index: number) => {
      if (!replayPoints.length) {
        setCursorIndex(0);
        return;
      }
      const bounded = clampIndex(index, replayPoints.length);
      setCursorIndex(bounded);
      setIsPlaying(false);
    },
    [replayPoints.length]
  );

  const seekToProgress = useCallback(
    (progress: number) => {
      if (!replayPoints.length) return;
      const bounded = Math.min(Math.max(progress, 0), 1);
      const target = Math.round(bounded * (replayPoints.length - 1));
      seekToIndex(target);
    },
    [replayPoints.length, seekToIndex]
  );

  const seekToTime = useCallback(
    (iso: string) => {
      if (!replayPoints.length) return;
      const targetTs = Date.parse(iso);
      if (Number.isNaN(targetTs)) return;
      const idx = replayPoints.findIndex((point) => {
        const ts = toMillis(point);
        return ts !== null && ts >= targetTs;
      });
      if (idx === -1) {
        seekToIndex(replayPoints.length - 1);
        return;
      }
      seekToIndex(idx);
    },
    [replayPoints, seekToIndex]
  );

  const selectSession = useCallback(
    async (sessionId: string, options?: { autoLoad?: boolean; replayParams?: TelemetryReplayQuery }) => {
      setSelectedSessionId(sessionId);
      if (options?.autoLoad) {
        await loadReplay(sessionId, options.replayParams);
      } else {
        setIsPlaying(false);
        setCursorIndex(0);
      }
    },
    [loadReplay]
  );

  const consumedTrail = useMemo(() => replayPoints.slice(0, cursorIndex + 1), [cursorIndex, replayPoints]);
  const stats = useMemo(() => computeStats(consumedTrail), [consumedTrail]);
  const events = useMemo(() => deriveEvents(consumedTrail), [consumedTrail]);

  const progress = useMemo(() => {
    if (replayPoints.length <= 1) return 0;
    return cursorIndex / (replayPoints.length - 1);
  }, [cursorIndex, replayPoints.length]);

  const timeline = useMemo(() => {
    if (!replayPoints.length) return null;
    const start = toMillis(replayPoints[0]);
    const end = toMillis(replayPoints[replayPoints.length - 1]);
    if (start === null || end === null) return null;
    return { start, end, durationMs: Math.max(0, end - start) };
  }, [replayPoints]);

  const playback: ReplayPlaybackState = {
    isPlaying,
    speed: playbackSpeed,
    cursorIndex,
    progress,
    durationMs: timeline?.durationMs ?? 0,
    play,
    pause,
    toggle,
    setSpeed: updateSpeed,
    seekToIndex,
    seekToProgress,
    seekToTime,
  };

  const selectedSession = useMemo(
    () => sessions.find((session) => session.session_id === selectedSessionId),
    [selectedSessionId, sessions]
  );

  return {
    sessions,
    sessionsLoading,
    replayLoading,
    error,
    selectedSessionId,
    selectedSession,
    replayPoints,
    currentPoint: replayPoints[cursorIndex],
    nextPoint: replayPoints[cursorIndex + 1],
    stats,
    events,
    playback,
    timeline,
    loadSessions,
    loadReplay,
    selectSession,
  };
};
