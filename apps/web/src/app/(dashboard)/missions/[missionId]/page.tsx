"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCheck, ClipboardList } from "lucide-react";

import { MissionHeader } from "@/components/missions/mission-header";
import { MissionDetailsCard } from "@/components/missions/mission-details-card";
import { MissionStatsDisplay } from "@/components/missions/mission-stats-display";
import { MissionChecklistSummary } from "@/components/missions/mission-checklist-summary";
import type { ChecklistSection } from "@/components/missions/mission-checklist-summary";
import { LiveMissionView } from "@/components/missions/live-mission-view";
import { CompletedMissionView } from "@/components/missions/completed-mission-view";
import { MissionPreflightPanel } from "@/components/missions/mission-preflight-panel";
import { MissionPostflightPanel } from "@/components/missions/mission-postflight-panel";
import { TelemetryStatusIndicator } from "@/components/telemetry/telemetry-status-indicator";
import type { TelemetryMapHandle } from "@/components/telemetry/telemetry-map";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth.hooks";
import { useMissionDetails } from "@/hooks/use-mission-details";
import { useMissionPermissions } from "@/hooks/use-mission-permissions";
import { useCompletedMissionData } from "@/hooks/use-completed-mission-data";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { useMissionPreflight } from "@/hooks/missions/mission-preflight.hooks";
import { useMissionPostflight } from "@/hooks/missions/mission-postflight.hooks";
import { useTelemetry } from "@/hooks/telemetry.hooks";
import { TELEMETRY_STREAMABLE_STATUSES } from "@/lib/missions/mission.constants";

export default function MissionTelemetryPage() {
  const params = useParams<{ missionId: string }>();
  const missionId = params?.missionId ?? "";
  const { user, isAdmin, isPilot } = useAuth();
  const mapRef = useRef<TelemetryMapHandle | null>(null);

  // Mission data and status management
  const {
    mission,
    loading,
    error,
    statusLoading,
    statusError,
    refreshMission,
    handleStatusChange,
  } = useMissionDetails({
    missionId,
    onMissionUpdated: (updated) => {
      setPreflight(updated.preflight_checklist ?? null);
      setPostflight(updated.postflight_checklist ?? null);
    },
  });

  // Preflight checklist management
  const [preflightUpdatingId, setPreflightUpdatingId] = useState<string | null>(
    null
  );
  const [preflightActionError, setPreflightActionError] = useState<
    string | null
  >(null);
  const [isPreflightSummaryOpen, setPreflightSummaryOpen] = useState(false);
  const {
    preflight,
    loading: preflightLoading,
    error: preflightError,
    fetchPreflight,
    updatePreflight,
    setPreflight,
  } = useMissionPreflight({ missionId });

  // Postflight checklist management
  const [postflightUpdatingId, setPostflightUpdatingId] = useState<
    string | null
  >(null);
  const [postflightActionError, setPostflightActionError] = useState<
    string | null
  >(null);
  const [isPostflightSummaryOpen, setPostflightSummaryOpen] = useState(false);
  const {
    postflight,
    loading: postflightLoading,
    error: postflightError,
    fetchPostflight,
    updatePostflight,
    setPostflight,
  } = useMissionPostflight({ missionId });

  // Permissions
  const {
    canEditPreflight,
    canEditPostflight,
    canStartMission,
    canEndMission,
  } = useMissionPermissions({
    mission,
    user,
    isAdmin,
    isPilot,
  });

  // PDF Export
  const { exporting, exportError, handleExport } = usePdfExport({
    missionId,
    mapRef,
  });

  // Derived state
  const missionStatus = mission?.status ?? "DRAFT";
  const isMissionCompleted = missionStatus === "COMPLETED";
  const canStreamTelemetry = TELEMETRY_STREAMABLE_STATUSES.includes(
    missionStatus as any
  );

  // Live telemetry
  const {
    points,
    latestPoint,
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

  // Completed mission telemetry
  const {
    completedTrail,
    completedLatestPoint,
    completedTrailError,
    loading: completedDataLoading,
  } = useCompletedMissionData({ missionId, isCompleted: isMissionCompleted });

  // Fetch initial data
  useEffect(() => {
    if (!missionId) return;
    void (async () => {
      try {
        await refreshMission();
      } catch {
        // Error handled by hook
      }
      try {
        await fetchPreflight();
        setPreflightActionError(null);
      } catch {
        // Error handled by hook
      }
      try {
        await fetchPostflight();
        setPostflightActionError(null);
      } catch {
        // Error handled by hook
      }
    })();
  }, [missionId, refreshMission, fetchPreflight, fetchPostflight]);

  // Auto-connect/disconnect telemetry based on mission status
  useEffect(() => {
    if (!missionId || !canStreamTelemetry) {
      disconnect();
      return;
    }
    connect().catch(() => null);
    return () => disconnect();
  }, [canStreamTelemetry, connect, disconnect, missionId]);

  // Checklist handlers
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
        const message =
          err instanceof Error
            ? err.message
            : "Failed to update checklist item";
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
        const message =
          err instanceof Error
            ? err.message
            : "Failed to update checklist note";
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
        const message =
          err instanceof Error
            ? err.message
            : "Failed to update checklist item";
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
        const message =
          err instanceof Error
            ? err.message
            : "Failed to update checklist note";
        setPostflightActionError(message);
      } finally {
        setPostflightUpdatingId(null);
      }
    },
    [missionId, updatePostflight, refreshMission]
  );

  // Computed values for display
  const droneLabel = mission?.drone_name ?? mission?.drone_id ?? "—";
  const pilotLabel = mission?.pilot_name ?? "Unassigned";
  const preflightSource = preflight ?? mission?.preflight_checklist ?? null;
  const postflightSource = postflight ?? mission?.postflight_checklist ?? null;
  const shortSessionLabel = useMemo(
    () => (activeSessionId ? `${activeSessionId.slice(0, 8)}…` : null),
    [activeSessionId]
  );

  // Preflight summary sections
  const preflightSummarySections = useMemo((): ChecklistSection[] => {
    const items = preflightSource?.items ?? [];
    if (!items.length) return [];
    const map = new Map<string, { total: number; completed: number }>();
    items.forEach((item) => {
      const key = item.section_title ?? "Checklist";
      const entry = map.get(key) ?? { total: 0, completed: 0 };
      entry.total += 1;
      if (item.is_completed) entry.completed += 1;
      map.set(key, entry);
    });
    return Array.from(map.entries()).map(([title, stats]) => ({
      title,
      ...stats,
    }));
  }, [preflightSource]);

  // Postflight summary sections
  const postflightSummarySections = useMemo((): ChecklistSection[] => {
    const items = postflightSource?.items ?? [];
    if (!items.length) return [];
    const map = new Map<string, { total: number; completed: number }>();
    items.forEach((item) => {
      const key = item.section_title ?? "Checklist";
      const entry = map.get(key) ?? { total: 0, completed: 0 };
      entry.total += 1;
      if (item.is_completed) entry.completed += 1;
      map.set(key, entry);
    });
    return Array.from(map.entries()).map(([title, stats]) => ({
      title,
      ...stats,
    }));
  }, [postflightSource]);

  const shouldShowPostflightPanel = missionStatus === "COMPLETED";
  const postflightCompleted = useMemo(() => {
    if (!postflightSource) return false;
    if (postflightSource.status === "COMPLETED") return true;
    const items = postflightSource.items ?? [];
    if (!items.length) return Boolean(postflightSource.completed_at);
    return items.every((item) => item.is_completed);
  }, [postflightSource]);

  const showPostflightEditor =
    shouldShowPostflightPanel && !postflightCompleted;
  const showPostflightSummaryButton = Boolean(
    postflightSource && postflightCompleted
  );

  // Loading state
  if (loading && !mission) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading mission...</p>
      </div>
    );
  }

  // Error state
  if (error && !mission) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => refreshMission()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <MissionHeader
        mission={mission}
        canStartMission={canStartMission}
        canEndMission={canEndMission}
        statusLoading={statusLoading}
        exporting={exporting}
        onStartMission={() => handleStatusChange("start")}
        onEndMission={() => handleStatusChange("complete")}
        onExportPdf={handleExport}
      />

      {/* Status indicator and session */}
      <div className="flex flex-wrap items-center gap-3">
        <TelemetryStatusIndicator state={connectionState} />
        {shortSessionLabel && (
          <span className="text-xs text-muted-foreground">
            Session {shortSessionLabel}
          </span>
        )}
      </div>

      {/* Error messages */}
      {(statusError ||
        exportError ||
        preflightActionError ||
        postflightActionError ||
        telemetryError) && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              {statusError ||
                exportError ||
                preflightActionError ||
                postflightActionError ||
                telemetryError}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Mission details and stats */}
      {mission && (
        <div className="grid gap-6 md:grid-cols-3">
          <MissionDetailsCard
            mission={mission}
            droneLabel={droneLabel}
            pilotLabel={pilotLabel}
          />

          <MissionStatsDisplay
            waypointCount={mission.waypoints?.length ?? 0}
            totalDistance={undefined}
            estimatedDuration={undefined}
          />

          {/* Checklist summaries */}
          <div className="flex flex-col gap-3">
            {preflightSummarySections.length > 0 && (
              <MissionChecklistSummary
                title="Preflight checklist"
                description="Review completed preflight checks"
                sections={preflightSummarySections}
                isOpen={isPreflightSummaryOpen}
                onOpenChange={setPreflightSummaryOpen}
              />
            )}
            {showPostflightSummaryButton && (
              <MissionChecklistSummary
                title="Postflight checklist"
                description="Review completed postflight checks"
                sections={postflightSummarySections}
                isOpen={isPostflightSummaryOpen}
                onOpenChange={setPostflightSummaryOpen}
              />
            )}
          </div>
        </div>
      )}

      {/* Preflight checklist panel */}
      {preflightSource && canEditPreflight && (
        <MissionPreflightPanel
          preflight={preflightSource}
          canEdit={true}
          onToggleItem={handlePreflightToggle}
          onUpdateNote={handlePreflightNoteUpdate}
          updatingItemId={preflightUpdatingId}
          error={preflightError ?? preflightActionError}
          loading={preflightLoading}
        />
      )}

      {/* Live telemetry view */}
      {mission && canStreamTelemetry && !isMissionCompleted && (
        <LiveMissionView
          mapRef={mapRef}
          points={points}
          latestPoint={latestPoint === undefined ? null : latestPoint}
          waypoints={mission.waypoints ?? []}
          events={events}
          alerts={alerts}
          droneId={mission.drone_id}
        />
      )}

      {/* Completed mission view */}
      {mission && isMissionCompleted && postflightCompleted && (
        <CompletedMissionView
          missionId={missionId}
          completedLatestPoint={completedLatestPoint}
          completedTrailError={completedTrailError}
          loading={completedDataLoading}
        />
      )}

      {/* Postflight completion notice */}
      {mission &&
        isMissionCompleted &&
        !postflightCompleted &&
        shouldShowPostflightPanel && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <p className="text-sm text-amber-800">
                Complete the post-flight checklist to unlock mission replay
                data.
              </p>
            </CardContent>
          </Card>
        )}

      {/* Postflight checklist panel */}
      {postflightSource && showPostflightEditor && canEditPostflight && (
        <MissionPostflightPanel
          postflight={postflightSource}
          canEdit={true}
          onToggleItem={handlePostflightToggle}
          onUpdateNote={handlePostflightNoteUpdate}
          updatingItemId={postflightUpdatingId}
          error={postflightError ?? postflightActionError}
          loading={postflightLoading}
        />
      )}
    </div>
  );
}
