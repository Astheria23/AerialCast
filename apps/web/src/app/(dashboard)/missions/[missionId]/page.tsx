'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';

import { TelemetryEventFeed } from '@/components/telemetry/telemetry-event-feed';
import { TelemetryMap } from '@/components/telemetry/telemetry-map';
import { TelemetryStatusIndicator } from '@/components/telemetry/telemetry-status-indicator';
import { TelemetryVitals } from '@/components/telemetry/telemetry-vitals';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTelemetry } from '@/hooks/telemetry.hooks';
import { cn } from '@/lib/utils';
import { missionsService } from '@/services/missions.service';
import type { Mission } from '@/types/missions.types';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-800',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  IN_PROGRESS: 'bg-sky-100 text-sky-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELED: 'bg-zinc-100 text-zinc-700',
};

export default function MissionTelemetryPage() {
  const params = useParams<{ missionId: string }>();
  const missionId = params?.missionId ?? '';
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!missionId) return;
    const fetchMission = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await missionsService.getMissionById(missionId);
        setMission(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load mission';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    void fetchMission();
  }, [missionId]);

  const canStreamTelemetry = useMemo(() => {
    const status = mission?.status ?? 'DRAFT';
    return status === 'APPROVED' || status === 'IN_PROGRESS';
  }, [mission?.status]);

  const [telemetryMode, setTelemetryMode] = useState<'live' | 'mock'>(() => (canStreamTelemetry ? 'live' : 'mock'));
  const telemetryModeOverrideRef = useRef(false);

  useEffect(() => {
    if (!telemetryModeOverrideRef.current) {
      const desiredMode = canStreamTelemetry ? 'live' : 'mock';
      setTelemetryMode((prev) => (prev === desiredMode ? prev : desiredMode));
      return;
    }
    if (!canStreamTelemetry && telemetryMode === 'live') {
      setTelemetryMode('mock');
      telemetryModeOverrideRef.current = false;
    }
  }, [canStreamTelemetry, telemetryMode]);

  const handleTelemetryModeChange = (mode: 'live' | 'mock') => {
    if (mode === 'live' && !canStreamTelemetry) {
      return;
    }
    telemetryModeOverrideRef.current = true;
    setTelemetryMode(mode);
  };

  const {
    points,
    latestPoint,
    stats,
    events,
    connectionState,
    error: telemetryError,
    connect,
    disconnect,
    isMockStream,
    activeSessionId,
  } = useTelemetry({
    missionId,
    missionWaypoints: mission?.waypoints ?? [],
    autoStart: false,
    mockStream: telemetryMode === 'mock',
    fallbackToMock: telemetryMode === 'live',
    pollIntervalMs: 4000,
  });

  useEffect(() => {
    if (!missionId) return undefined;
    if (telemetryMode === 'live' && !canStreamTelemetry) {
      disconnect();
      return undefined;
    }
    void connect();
    return () => disconnect();
  }, [canStreamTelemetry, connect, disconnect, missionId, telemetryMode]);

  const missionStatusClass = STATUS_COLORS[mission?.status ?? 'DRAFT'] ?? STATUS_COLORS.DRAFT;
  const latestPoints = points.slice(-6).reverse();
  const shortSessionLabel = useMemo(
    () => (activeSessionId ? `${activeSessionId.slice(0, 8)}…` : null),
    [activeSessionId]
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/missions">
              <ArrowLeft className="h-4 w-4" />
              Back to missions
            </Link>
          </Button>
          <TelemetryStatusIndicator state={connectionState} isMock={isMockStream} />
        </div>
        <Button asChild variant="outline">
          <Link href={`/missions/${missionId}/export`}>Export flight log</Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">Telemetry source</p>
            <p className="text-xs text-muted-foreground">
              {telemetryMode === 'live'
                ? 'Polling the backend replay endpoint for the most recent packets.'
                : 'Running the deterministic demo stream for rehearsals and UI validation.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex overflow-hidden rounded-lg border text-sm font-medium shadow-sm">
              <button
                type="button"
                onClick={() => handleTelemetryModeChange('live')}
                disabled={!canStreamTelemetry && telemetryMode !== 'live'}
                className={cn(
                  'px-3 py-1.5 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  telemetryMode === 'live'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted/80',
                  !canStreamTelemetry && 'cursor-not-allowed opacity-60'
                )}
              >
                Live backend
              </button>
              <button
                type="button"
                onClick={() => handleTelemetryModeChange('mock')}
                className={cn(
                  'px-3 py-1.5 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  telemetryMode === 'mock'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted/80'
                )}
              >
                Demo stream
              </button>
            </div>
            {telemetryMode === 'live' && shortSessionLabel && (
              <span className="text-xs text-muted-foreground">Session {shortSessionLabel}</span>
            )}
          </div>
        </div>
        {telemetryMode === 'live' && isMockStream && canStreamTelemetry && (
          <p className="mt-2 text-xs text-muted-foreground">
            Waiting for fresh backend packets — showing cached/demo data until the next update arrives.
          </p>
        )}
        {telemetryMode === 'mock' && canStreamTelemetry && (
          <p className="mt-2 text-xs text-muted-foreground">
            You are viewing the rehearsal stream even though live data is available.
          </p>
        )}
        {telemetryMode === 'live' && !canStreamTelemetry && (
          <p className="mt-2 text-xs text-amber-600">
            Approve or start this mission to unlock the backend stream. Demo data will play meanwhile.
          </p>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading mission details...
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {mission && (
        <Card>
          <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-3xl font-bold">{mission.mission_name}</CardTitle>
              <p className="text-muted-foreground">Assigned drone {mission.drone_id}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${missionStatusClass}`}>
                {(mission.status ?? 'DRAFT').replace(/_/g, ' ')}
              </span>
              <div className="text-right text-sm text-muted-foreground">
                <p>{mission.waypoints?.length ?? 0} waypoint(s)</p>
                <p>Created {mission.created_at ? new Date(mission.created_at).toLocaleString() : '—'}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
              <p>{mission.notes || 'No notes provided'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Checklist links</p>
              {mission.checklist_ids?.length ? (
                <ul className="list-disc pl-4 text-sm text-muted-foreground">
                  {mission.checklist_ids.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No checklist attached</p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Waypoint preview</p>
              {mission.waypoints?.length ? (
                <p className="text-sm text-muted-foreground">
                  Start @ {mission.waypoints[0].latitude.toFixed(4)}, {mission.waypoints[0].longitude.toFixed(4)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No waypoints plotted</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!canStreamTelemetry && mission && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Live telemetry becomes available once a mission is approved or in progress. Current status: {(mission.status ?? 'DRAFT').replace(/_/g, ' ')}.
        </div>
      )}
      {telemetryError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {telemetryError}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="h-[420px]">
          <TelemetryMap waypoints={mission?.waypoints} trail={points} latestPoint={latestPoint} />
        </div>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Flight vitals</CardTitle>
            </CardHeader>
            <CardContent>
              <TelemetryVitals stats={stats} latestPoint={latestPoint} />
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Live events</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[260px] space-y-3 overflow-y-auto pr-2">
              <TelemetryEventFeed events={events} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest telemetry samples</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2">Timestamp</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Altitude</th>
                <th>Battery</th>
                <th>Signal</th>
              </tr>
            </thead>
            <tbody>
              {latestPoints.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-muted-foreground">
                    Waiting for telemetry samples...
                  </td>
                </tr>
              )}
              {latestPoints.map((point) => (
                <tr key={point.telemetry_id ?? `${point.latitude}-${point.longitude}`} className="border-t border-border/60">
                  <td className="py-2">{point.recorded_at ? new Date(point.recorded_at).toLocaleTimeString() : '—'}</td>
                  <td>{point.latitude.toFixed(4)}</td>
                  <td>{point.longitude.toFixed(4)}</td>
                  <td>{point.altitude ? `${point.altitude.toFixed(1)} m` : '—'}</td>
                  <td>{point.battery_voltage ? `${point.battery_voltage.toFixed(2)} V` : '—'}</td>
                  <td>{point.rssi ? `${point.rssi} dBm` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
