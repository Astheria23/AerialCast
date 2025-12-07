'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';

import { TelemetryEventFeed } from '@/components/telemetry/telemetry-event-feed';
import { TelemetryMap } from '@/components/telemetry/telemetry-map';
import { TelemetryStatusIndicator } from '@/components/telemetry/telemetry-status-indicator';
import { TelemetryVitals } from '@/components/telemetry/telemetry-vitals';
import { MissionReplayPanel } from '@/components/telemetry/mission-replay-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/auth.hooks';
import { useTelemetry } from '@/hooks/telemetry.hooks';
import { missionsService } from '@/services/missions.service';
import type { Mission, MissionStatusAction } from '@/types/missions.types';

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
  const { user, isAdmin, isPilot } = useAuth();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const isMissionCompleted = mission?.status === 'COMPLETED';

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

  const canControlMission = useMemo(() => {
    if (!mission || !user) {
      return false;
    }
    const isOwner = mission.created_by_user_id === user.id;
    const adminIsOwner = isAdmin && isOwner;
    return (isOwner && isPilot) || adminIsOwner;
  }, [isAdmin, isPilot, mission, user]);

  const canStartMission = Boolean(mission?.status === 'APPROVED' && canControlMission);
  const canEndMission = Boolean(mission?.status === 'IN_PROGRESS' && canControlMission);

  const handleMissionStatusChange = useCallback(
    async (action: MissionStatusAction) => {
      if (!missionId) return;
      setStatusLoading(true);
      setStatusError(null);
      try {
        const updated = await missionsService.changeStatus(missionId, action);
        setMission(updated);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update mission status';
        setStatusError(message);
      } finally {
        setStatusLoading(false);
      }
    },
    [missionId]
  );

  const {
    points,
    latestPoint,
    stats,
    events,
    connectionState,
    error: telemetryError,
    connect,
    disconnect,
    activeSessionId,
  } = useTelemetry({
    missionId,
    autoStart: false,
    pollIntervalMs: 4000,
  });

  useEffect(() => {
    if (!missionId) return undefined;
    if (!canStreamTelemetry) {
      disconnect();
      return undefined;
    }
    connect().catch(() => null);
    return () => disconnect();
  }, [canStreamTelemetry, connect, disconnect, missionId]);

  const missionStatusClass = STATUS_COLORS[mission?.status ?? 'DRAFT'] ?? STATUS_COLORS.DRAFT;
  const latestPoints = points.slice(-6).reverse();
  const shortSessionLabel = useMemo(
    () => (activeSessionId ? `${activeSessionId.slice(0, 8)}…` : null),
    [activeSessionId]
  );
  const alertEvents = useMemo(
    () => events.filter((event) => event.severity && event.severity !== 'info'),
    [events]
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/missions">
              <ArrowLeft className="h-4 w-4" />
              Back to missions
            </Link>
          </Button>
          <TelemetryStatusIndicator state={connectionState} />
          {shortSessionLabel && (
            <span className="text-xs text-muted-foreground">Session {shortSessionLabel}</span>
          )}
        </div>
        <Button asChild variant="outline">
          <Link href={`/missions/${missionId}/export`}>Export flight log</Link>
        </Button>
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
      {statusError && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> {statusError}
        </div>
      )}

      {mission && (
        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-3xl font-bold">{mission.mission_name}</CardTitle>
              <p className="text-muted-foreground">Assigned drone {mission.drone_id}</p>
            </div>
            <div className="flex w-full flex-col items-end gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${missionStatusClass}`}>
                  {(mission.status ?? 'DRAFT').replace(/_/g, ' ')}
                </span>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{mission.waypoints?.length ?? 0} waypoint(s)</p>
                  <p>Created {mission.created_at ? new Date(mission.created_at).toLocaleString() : '—'}</p>
                </div>
              </div>
              {(canStartMission || canEndMission) && (
                <div className="flex flex-wrap justify-end gap-2">
                  {canStartMission && (
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleMissionStatusChange('start')}
                      disabled={statusLoading}
                    >
                      {statusLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Updating...
                        </>
                      ) : (
                        'Start mission'
                      )}
                    </Button>
                  )}
                  {canEndMission && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="gap-2"
                      onClick={() => handleMissionStatusChange('complete')}
                      disabled={statusLoading}
                    >
                      {statusLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Updating...
                        </>
                      ) : (
                        'End mission'
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
              <p>{mission.notes || 'No notes provided'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Required checklists</p>
              {mission.required_checklists?.length ? (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {mission.required_checklists.map((item) => (
                    <li key={item.checklist_id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2">
                      <span className="font-medium text-foreground">{item.title}</span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] uppercase tracking-wide">
                        {String(item.type).replace(/_/g, ' ')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No checklist attached</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Active geofences</p>
              {mission.active_geofences?.length ? (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {mission.active_geofences.map((geo) => (
                    <li key={geo.geofence_id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2">
                      <span className="font-medium text-foreground">{geo.area_name}</span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] uppercase tracking-wide">
                        {String(geo.type).replace(/_/g, ' ')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No geofence enforced</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {mission?.waypoints?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Waypoint preview</CardTitle>
            <p className="text-sm text-muted-foreground">First plotted coordinate and total count.</p>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-border/60 bg-card/70 px-4 py-3 text-sm text-muted-foreground">
              Start @ {mission.waypoints[0].latitude.toFixed(4)}, {mission.waypoints[0].longitude.toFixed(4)} · {mission.waypoints.length}{' '}
              {mission.waypoints.length === 1 ? 'waypoint' : 'waypoints'} planned.
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isMissionCompleted && !canStreamTelemetry && mission && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Live telemetry becomes available once a mission is approved or in progress. Current status: {(mission.status ?? 'DRAFT').replace(/_/g, ' ')}.
        </div>
      )}
      {!isMissionCompleted && telemetryError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {telemetryError}
        </div>
      )}

      {!isMissionCompleted && (
        <>
          <div className="grid gap-6 xl:grid-cols-[2fr_1fr] xl:items-stretch">
            <div className="h-full min-h-[420px]">
              <TelemetryMap
                waypoints={mission?.waypoints}
                trail={points}
                latestPoint={latestPoint}
                geofences={mission?.active_geofences}
              />
            </div>
            <div className="flex h-full flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Flight vitals</CardTitle>
                </CardHeader>
                <CardContent>
                  <TelemetryVitals stats={stats} latestPoint={latestPoint} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Alerts</CardTitle>
                    <p className="text-xs text-muted-foreground">Live alert feed from the aircraft</p>
                  </div>
                  {alertEvents.length > 0 && (
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                      {alertEvents.length}
                    </span>
                  )}
                </CardHeader>
                <CardContent className="max-h-[200px] space-y-3 overflow-y-auto pr-2">
                  {alertEvents.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
                      No alerts yet — keeping watch.
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {alertEvents.map((event) => {
                        const timestamp = new Date(event.timestamp);
                        const isCritical = event.severity === 'danger';
                        const badgeClasses = isCritical
                          ? 'bg-rose-100 text-rose-900 border-rose-200'
                          : 'bg-amber-100 text-amber-900 border-amber-200';
                        return (
                          <li key={event.id} className="rounded-xl border border-border/70 bg-card/90 p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClasses}`}>
                                {isCritical ? 'Critical' : 'Warning'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {timestamp.toLocaleTimeString()} · {timestamp.toLocaleDateString()}
                              </span>
                            </div>
                            <p className="mt-2 font-semibold">{event.summary}</p>
                            {event.details && <p className="text-muted-foreground">{event.details}</p>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
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
        </>
      )}

      {mission && isMissionCompleted && (
        <MissionReplayPanel
          missionId={mission.mission_id}
          missionName={mission.mission_name}
          defaultStatuses={['LIVE', 'COMPLETED']}
          sessionLimit={15}
        />
      )}
    </div>
  );
}
