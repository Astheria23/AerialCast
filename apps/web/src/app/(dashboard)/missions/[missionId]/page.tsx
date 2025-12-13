'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ClipboardCheck, ClipboardList, Download, Loader2 } from 'lucide-react';

import { MissionPreflightPanel } from '@/components/missions/mission-preflight-panel';
import { MissionPostflightPanel } from '@/components/missions/mission-postflight-panel';
import { TelemetryEventFeed } from '@/components/telemetry/telemetry-event-feed';
import { TelemetryMap } from '@/components/telemetry/telemetry-map';
import type { TelemetryMapHandle } from '@/components/telemetry/telemetry-map';
import { TelemetryStatusIndicator } from '@/components/telemetry/telemetry-status-indicator';
import { TelemetryVitals } from '@/components/telemetry/telemetry-vitals';
import { MissionReplayPanel } from '@/components/telemetry/mission-replay-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/auth.hooks';
import { useMissionPreflight } from '@/hooks/mission-preflight.hooks';
import { useMissionPostflight } from '@/hooks/mission-postflight.hooks';
import { useTelemetry } from '@/hooks/telemetry.hooks';
import { missionsService } from '@/services/missions.service';
import { telemetryService } from '@/services/telemetry.service';
import type { Mission, MissionStatusAction } from '@/types/missions.types';
import type { TelemetryPoint } from '@/types/telemetry.types';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-800',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  READY_FOR_FLIGHT: 'bg-sky-100 text-sky-800',
  REJECTED: 'bg-rose-100 text-rose-700',
  IN_PROGRESS: 'bg-sky-100 text-sky-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELED: 'bg-zinc-100 text-zinc-700',
};

export default function MissionTelemetryPage() {
  const params = useParams<{ missionId: string }>();
  const missionId = params?.missionId ?? '';
  const { user, isAdmin, isPilot } = useAuth();
  const mapRef = useRef<TelemetryMapHandle | null>(null);
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const {
    preflight,
    loading: preflightLoading,
    error: preflightError,
    fetchPreflight,
    updatePreflight,
    setPreflight,
  } = useMissionPreflight({ missionId });
  const [preflightUpdatingId, setPreflightUpdatingId] = useState<string | null>(null);
  const [preflightActionError, setPreflightActionError] = useState<string | null>(null);
  const {
    postflight,
    loading: postflightLoading,
    error: postflightError,
    fetchPostflight,
    updatePostflight,
    setPostflight,
  } = useMissionPostflight({ missionId });
  const [postflightUpdatingId, setPostflightUpdatingId] = useState<string | null>(null);
  const [postflightActionError, setPostflightActionError] = useState<string | null>(null);
  const [isPreflightSummaryOpen, setPreflightSummaryOpen] = useState(false);
  const [isPostflightSummaryOpen, setPostflightSummaryOpen] = useState(false);
  const [completedTrail, setCompletedTrail] = useState<TelemetryPoint[]>([]);
  const [completedLatestPoint, setCompletedLatestPoint] = useState<TelemetryPoint | undefined>(undefined);
  const [completedTrailError, setCompletedTrailError] = useState<string | null>(null);
  const missionStatus = mission?.status ?? 'DRAFT';
  const isMissionCompleted = missionStatus === 'COMPLETED';

  const refreshMission = useCallback(async () => {
    if (!missionId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await missionsService.getMissionById(missionId);
      setMission(data);
      setPreflight(data.preflight_checklist ?? null);
    setPostflight(data.postflight_checklist ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load mission';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [missionId, setPreflight, setPostflight]);

  useEffect(() => {
    if (!missionId) return;
    void (async () => {
      try {
        await refreshMission();
      } catch {
        // mission error already handled above
      }
      try {
        await fetchPreflight();
        setPreflightActionError(null);
      } catch {
        // ignore, hook already exposes error state
      }
      try {
        await fetchPostflight();
        setPostflightActionError(null);
      } catch {
        // ignore, hook already exposes error state
      }
    })();
  }, [missionId, refreshMission, fetchPreflight, fetchPostflight, setPreflightActionError, setPostflightActionError]);

  const canStreamTelemetry = useMemo(() => {
    return (
      missionStatus === 'APPROVED' ||
      missionStatus === 'IN_PROGRESS' ||
      missionStatus === 'READY_FOR_FLIGHT'
    );
  }, [missionStatus]);

  const canControlMission = useMemo(() => {
    if (!mission || !user) {
      return false;
    }
    const isOwner = mission.created_by_user_id === user.id;
    const adminIsOwner = isAdmin && isOwner;
    return (isOwner && isPilot) || adminIsOwner;
  }, [isAdmin, isPilot, mission, user]);

  const canStartMission = Boolean(mission?.status === 'READY_FOR_FLIGHT' && canControlMission);
  const canEndMission = Boolean(mission?.status === 'IN_PROGRESS' && canControlMission);

  const handleMissionStatusChange = useCallback(
    async (action: MissionStatusAction) => {
      if (!missionId) return;
      setStatusLoading(true);
      setStatusError(null);
      try {
        const updated = await missionsService.changeStatus(missionId, action);
        setMission(updated);
        setPreflight(updated.preflight_checklist ?? null);
        setPostflight(updated.postflight_checklist ?? null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update mission status';
        setStatusError(message);
      } finally {
        setStatusLoading(false);
      }
    },
  [missionId, setPreflight, setPostflight]
  );

  const handleExportPdf = useCallback(async () => {
    if (!missionId) return;
    setExporting(true);
    setExportError(null);
    try {
      let mapImage: string | undefined;
      if (mapRef.current) {
        try {
          const captureResult = await mapRef.current.captureAsDataUrl();
          if (captureResult) {
            mapImage = captureResult;
          } else {
            const container = mapRef.current.getElement();
            if (container) {
              const { toPng } = await import('html-to-image');
              const pixelRatio = typeof window !== 'undefined' ? Math.min(3, window.devicePixelRatio || 2) : 2;
              mapImage = await toPng(container, {
                cacheBust: true,
                pixelRatio,
                backgroundColor: '#ffffff',
                quality: 1,
              });
            }
          }
        } catch (captureError) {
          console.warn('Unable to capture map screenshot, falling back to backend rendering', captureError);
        }
      }

      const blob = await missionsService.exportMissionPdf(missionId, mapImage);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `mission-${missionId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export mission PDF';
      setExportError(message);
    } finally {
      setExporting(false);
    }
  }, [missionId]);

  const handlePreflightToggle = useCallback(
    async (itemId: string, nextState: boolean) => {
      if (!missionId) return;
      setPreflightActionError(null);
      setPreflightUpdatingId(itemId);
      try {
        await updatePreflight({
          items: [{ preflight_item_id: itemId, is_completed: nextState }],
        });
        await refreshMission();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update checklist item';
        setPreflightActionError(message);
      } finally {
        setPreflightUpdatingId(null);
      }
    },
    [missionId, updatePreflight, refreshMission]
  );

  const handlePreflightNoteUpdate = useCallback(
    async (itemId: string, note: string) => {
      if (!missionId) return;
      setPreflightActionError(null);
      setPreflightUpdatingId(itemId);
      try {
        await updatePreflight({
          items: [{ preflight_item_id: itemId, note }],
        });
        await refreshMission();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update checklist note';
        setPreflightActionError(message);
      } finally {
        setPreflightUpdatingId(null);
      }
    },
    [missionId, updatePreflight, refreshMission]
  );

  const handlePostflightToggle = useCallback(
    async (itemId: string, nextState: boolean) => {
      if (!missionId) return;
      setPostflightActionError(null);
      setPostflightUpdatingId(itemId);
      try {
        await updatePostflight({
          items: [{ postflight_item_id: itemId, is_completed: nextState }],
        });
        await refreshMission();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update post-flight item';
        setPostflightActionError(message);
      } finally {
        setPostflightUpdatingId(null);
      }
    },
    [missionId, updatePostflight, refreshMission]
  );

  const handlePostflightNoteUpdate = useCallback(
    async (itemId: string, note: string) => {
      if (!missionId) return;
      setPostflightActionError(null);
      setPostflightUpdatingId(itemId);
      try {
        await updatePostflight({
          items: [{ postflight_item_id: itemId, note }],
        });
        await refreshMission();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update post-flight note';
        setPostflightActionError(message);
      } finally {
        setPostflightUpdatingId(null);
      }
    },
    [missionId, updatePostflight, refreshMission]
  );

  const {
    points,
    latestPoint,
    stats,
    events,
    alerts,
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

  useEffect(() => {
    if (!missionId || missionStatus !== 'COMPLETED') {
      setCompletedTrail([]);
      setCompletedLatestPoint(undefined);
      setCompletedTrailError(null);
      return;
    }

    let cancelled = false;
    setCompletedTrailError(null);

    const loadReplay = async () => {
      try {
        const latestSession = await telemetryService.getLatestSessionForMission(missionId);
        if (!latestSession || !latestSession.session_id) {
          if (!cancelled) {
            setCompletedTrail([]);
            setCompletedLatestPoint(undefined);
          }
          return;
        }
        const replay = await telemetryService.getSessionReplay(latestSession.session_id, { sampleEvery: 1 });
        if (cancelled) {
          return;
        }
        setCompletedTrail(replay ?? []);
        setCompletedLatestPoint(replay.at(-1));
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.warn('Failed to load completed mission telemetry', error);
        const message = error instanceof Error ? error.message : 'Unable to load mission telemetry history';
        setCompletedTrailError(message);
        setCompletedTrail([]);
        setCompletedLatestPoint(undefined);
      }
    };

    void loadReplay();

    return () => {
      cancelled = true;
    };
  }, [missionId, missionStatus]);

  const missionStatusClass = STATUS_COLORS[mission?.status ?? 'DRAFT'] ?? STATUS_COLORS.DRAFT;
  const latestPoints = points.slice(-6).reverse();
  const shortSessionLabel = useMemo(
    () => (activeSessionId ? `${activeSessionId.slice(0, 8)}…` : null),
    [activeSessionId]
  );
  const alertEvents = alerts;
  const droneLabel = mission?.drone_name ?? mission?.drone_id ?? '—';
  const pilotLabel = mission?.pilot_name ?? 'Unassigned';
  const preflightSource = preflight ?? mission?.preflight_checklist ?? null;
  const postflightSource = postflight ?? mission?.postflight_checklist ?? null;
  const preflightSummarySections = useMemo(() => {
    const items = preflightSource?.items ?? [];
    if (!items.length) {
      return [] as Array<{ title: string; total: number; completed: number }>;
    }
    const map = new Map<string, { total: number; completed: number }>();
    items.forEach((item) => {
      const key = item.section_title ?? 'Checklist';
      const entry = map.get(key) ?? { total: 0, completed: 0 };
      entry.total += 1;
      if (item.is_completed) {
        entry.completed += 1;
      }
      map.set(key, entry);
    });
    return Array.from(map.entries()).map(([title, value]) => ({
      title,
      total: value.total,
      completed: value.completed,
    }));
  }, [preflightSource]);
  const showPreflightEditor = Boolean(
    mission && ['PENDING_APPROVAL', 'APPROVED', 'READY_FOR_FLIGHT'].includes(missionStatus)
  );
  const showPreflightSummaryButton = Boolean(preflightSource && !showPreflightEditor);

  const canEditPreflight = useMemo(() => {
    if (!mission || !user) {
      return false;
    }
    const status = mission.status ?? 'DRAFT';
    const editableStatuses = new Set(['PENDING_APPROVAL', 'APPROVED', 'READY_FOR_FLIGHT']);
    if (!editableStatuses.has(status)) {
      return false;
    }
    if (isAdmin) {
      return true;
    }
    const requesterId = user.id;
    return (
      mission.created_by_user_id === requesterId ||
      mission.assigned_pilot_id === requesterId
    );
  }, [mission, user, isAdmin]);

  const canEditPostflight = useMemo(() => {
    if (!mission || !user) {
      return false;
    }
    const status = mission.status ?? 'DRAFT';
    const editableStatuses = new Set(['COMPLETED']);
    if (!editableStatuses.has(status)) {
      return false;
    }
    if (isAdmin) {
      return true;
    }
    const requesterId = user.id;
    return (
      mission.created_by_user_id === requesterId ||
      mission.assigned_pilot_id === requesterId
    );
  }, [mission, user, isAdmin]);

  const shouldShowPostflightPanel = missionStatus === 'COMPLETED';
  const postflightCompleted = useMemo(() => {
    if (!postflightSource) {
      return false;
    }
    if (postflightSource.status === 'COMPLETED') {
      return true;
    }
    const items = postflightSource.items ?? [];
    if (!items.length) {
      return Boolean(postflightSource.completed_at);
    }
    return items.every((item) => item.is_completed);
  }, [postflightSource]);
  const showPostflightEditor = shouldShowPostflightPanel && !postflightCompleted;
  const showPostflightSummaryButton = Boolean(postflightSource && postflightCompleted);
  const exportTrail = isMissionCompleted ? completedTrail : points;
  const exportLatestPoint = isMissionCompleted ? completedLatestPoint : latestPoint;

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
        <Button
          variant="outline"
          className="gap-2"
          disabled={exporting}
          onClick={() => {
            void handleExportPdf();
          }}
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Generating PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" /> Export flight log
            </>
          )}
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
      {exportError && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> {exportError}
        </div>
      )}
      {isMissionCompleted && completedTrailError && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" /> {completedTrailError}
        </div>
      )}

      {mission && (
        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-3xl font-bold">{mission.mission_name}</CardTitle>
              <p className="text-muted-foreground">Assigned drone {droneLabel}</p>
              <p className="text-muted-foreground">Pilot {pilotLabel}</p>
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
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Preflight sections</p>
              {preflightSummarySections.length ? (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {preflightSummarySections.map((section) => (
                    <li
                      key={section.title}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2"
                    >
                      <span className="font-medium text-foreground">{section.title}</span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] uppercase tracking-wide">
                        {section.completed} / {section.total} done
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No preflight items configured</p>
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

      {showPreflightEditor ? (
        <MissionPreflightPanel
          key={(preflightSource?.preflight_id ?? 'preflight-panel')}
          missionName={mission?.mission_name}
          preflight={preflightSource}
          status={preflightSource?.status}
          loading={preflightLoading}
          error={preflightActionError ?? preflightError}
          canEdit={canEditPreflight}
          onRefresh={() => fetchPreflight().catch(() => null)}
          onToggleItem={handlePreflightToggle}
          onUpdateNote={handlePreflightNoteUpdate}
          updatingItemId={preflightUpdatingId}
        />
      ) : showPreflightSummaryButton ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Pre-flight checklist locked</p>
              <p className="text-sm text-muted-foreground">
                The mission has already started. Review the recorded checks below.
              </p>
            </div>
            <Dialog open={isPreflightSummaryOpen} onOpenChange={setPreflightSummaryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-fit gap-2">
                  <ClipboardList className="h-4 w-4" /> View pre-flight checklist
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl">
                <DialogHeader>
                  <DialogTitle>Pre-flight checklist</DialogTitle>
                  <DialogDescription>Summary of all checks completed before take-off.</DialogDescription>
                </DialogHeader>
                <MissionPreflightPanel
                  key={(preflightSource?.preflight_id ?? 'preflight-modal')}
                  missionName={mission?.mission_name}
                  preflight={preflightSource}
                  status={preflightSource?.status}
                  loading={preflightLoading}
                  error={preflightError}
                  canEdit={false}
                  onRefresh={() => fetchPreflight().catch(() => null)}
                  readOnly
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ) : null}

      {showPostflightEditor ? (
        <MissionPostflightPanel
          key={(postflightSource?.postflight_id ?? 'postflight-panel')}
          missionName={mission?.mission_name}
          postflight={postflightSource}
          status={postflightSource?.status}
          loading={postflightLoading}
          error={postflightActionError ?? postflightError}
          canEdit={canEditPostflight}
          onRefresh={() => fetchPostflight().catch(() => null)}
          onToggleItem={handlePostflightToggle}
          onUpdateNote={handlePostflightNoteUpdate}
          updatingItemId={postflightUpdatingId}
        />
      ) : showPostflightSummaryButton ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Post-flight checklist completed</p>
              <p className="text-sm text-muted-foreground">
                Review the recorded findings without altering the mission log.
              </p>
            </div>
            <Dialog open={isPostflightSummaryOpen} onOpenChange={setPostflightSummaryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-fit gap-2">
                  <ClipboardCheck className="h-4 w-4" /> View post-flight report
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl">
                <DialogHeader>
                  <DialogTitle>Post-flight checklist</DialogTitle>
                  <DialogDescription>Documented results that unlocked mission replay.</DialogDescription>
                </DialogHeader>
                <MissionPostflightPanel
                  key={(postflightSource?.postflight_id ?? 'postflight-modal')}
                  missionName={mission?.mission_name}
                  postflight={postflightSource}
                  status={postflightSource?.status}
                  loading={postflightLoading}
                  error={postflightError}
                  canEdit={false}
                  onRefresh={() => fetchPostflight().catch(() => null)}
                  readOnly
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ) : null}

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
                ref={mapRef}
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
                    <th>SNR</th>
                  </tr>
                </thead>
                <tbody>
                  {latestPoints.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-muted-foreground">
                        Waiting for telemetry samples...
                      </td>
                    </tr>
                  )}
                  {latestPoints.map((point) => (
                    <tr key={point.telemetry_id ?? `${point.latitude}-${point.longitude}`} className="border-t border-border/60">
                      <td className="py-2">{point.recorded_at ? new Date(point.recorded_at).toLocaleTimeString() : '—'}</td>
                      <td>{point.latitude.toFixed(4)}</td>
                      <td>{point.longitude.toFixed(4)}</td>
                      <td>{typeof point.altitude === 'number' ? `${point.altitude.toFixed(1)} m` : '—'}</td>
                      <td>{typeof point.battery_voltage === 'number' ? `${point.battery_voltage.toFixed(2)} V` : '—'}</td>
                      <td>{typeof point.rssi === 'number' ? `${point.rssi} dBm` : '—'}</td>
                      <td>{typeof point.snr === 'number' ? `${point.snr.toFixed(1)} dB` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {mission && isMissionCompleted && (
        <div
          className="pointer-events-none absolute left-[-9999px] top-0 h-[360px] w-[360px] overflow-hidden"
          aria-hidden
        >
          <TelemetryMap
            ref={mapRef}
            waypoints={mission.waypoints}
            trail={exportTrail}
            latestPoint={exportLatestPoint ?? undefined}
            geofences={mission.active_geofences}
          />
        </div>
      )}

      {mission && isMissionCompleted && !postflightCompleted && shouldShowPostflightPanel && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Complete the post-flight checklist to unlock mission replay data.
        </div>
      )}

      {mission && isMissionCompleted && postflightCompleted && (
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
