"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Edit, Loader2, MapPin, MapPinned, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  Mission,
  MissionStatusAction,
  MissionStatus,
} from "@/types/missions.types";
import {
  STATUS_COLORS,
  STATUS_ACTION_MAP,
  STATUS_ACTION_LABELS,
  DESTRUCTIVE_ACTIONS,
} from "@/lib/missions/mission.constants";

interface MissionCardProps {
  isAdmin: boolean;
  mission: Mission;
  droneName?: string;
  onEdit?: (mission: Mission) => void;
  onDelete?: (missionId: string) => void;
  onStatusAction?: (mission: Mission, action: MissionStatusAction) => void;
  canPerformAction?: (action: MissionStatusAction) => boolean;
  disableActions?: boolean;
  isStatusUpdating?: boolean;
}

export function MissionCard({
  mission,
  droneName,
  isAdmin,
  onEdit,
  onDelete,
  onStatusAction,
  canPerformAction,
  disableActions,
  isStatusUpdating,
}: MissionCardProps) {
  const formattedDate = mission.created_at
    ? format(new Date(mission.created_at), "dd MMM yyyy HH:mm")
    : "";
  const status = mission.status || "DRAFT";
  const statusClass =
    STATUS_COLORS[status as MissionStatus] ?? STATUS_COLORS.DRAFT;
  const availableActions = STATUS_ACTION_MAP[status as MissionStatus] ?? [];
  const filteredActions = availableActions.filter((action) =>
    canPerformAction ? canPerformAction(action) : true
  );
  const resolvedDroneName = mission.drone_name ?? droneName ?? mission.drone_id;
  const preflight = mission.preflight_checklist;
  const postflight = mission.postflight_checklist;
  const preflightItems = preflight?.items ?? [];
  const preflightCompleted = preflightItems.filter(
    (item) => item.is_completed
  ).length;
  const preflightTotal = preflightItems.length;
  const preflightPercent =
    preflightTotal > 0
      ? Math.round((preflightCompleted / preflightTotal) * 100)
      : 0;
  const postflightItems = postflight?.items ?? [];
  const postflightCompleted = postflightItems.filter(
    (item) => item.is_completed
  ).length;
  const postflightTotal = postflightItems.length;
  const postflightPercent =
    postflightTotal > 0
      ? Math.round((postflightCompleted / postflightTotal) * 100)
      : 0;
  const shouldShowPostflight = status === "COMPLETED" && postflight;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{mission.mission_name}</CardTitle>
          <CardDescription className="mt-1">
            {mission.notes || "No notes"}
          </CardDescription>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
        >
          {status.replace(/_/g, " ")}
        </span>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Pilot</p>
          <p className="font-medium">{mission.pilot_name ?? "Unassigned"}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Drone</p>
          <p className="font-medium">{resolvedDroneName}</p>
        </div>
        {formattedDate && (
          <div>
            <p className="text-muted-foreground text-xs">Created at</p>
            <p className="font-medium">{formattedDate}</p>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{mission.waypoints?.length || 0} waypoint(s)</span>
        </div>
        {(preflight || shouldShowPostflight) && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Checklist
            </h4>
            {preflight && (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span className="sr-only">Preflight completion</span>
                  <span>
                    {preflightCompleted} / {preflightTotal}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                  <span>preflight</span>
                  <span>{preflightPercent}%</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${preflightPercent}%` }}
                  />
                </div>
              </div>
            )}
            {shouldShowPostflight && (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span className="sr-only">Postflight completion</span>
                  <span>
                    {postflightCompleted} / {postflightTotal}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                  <span>Postflight</span>
                  <span>{postflightPercent}%</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${postflightPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {filteredActions.length > 0 && onStatusAction && (
            <div className="flex flex-wrap gap-2">
              {filteredActions.map((action) => (
                <Button
                  key={action}
                  type="button"
                  variant={
                    DESTRUCTIVE_ACTIONS.includes(action)
                      ? "destructive"
                      : "secondary"
                  }
                  size="sm"
                  onClick={() => onStatusAction(mission, action)}
                  disabled={disableActions || isStatusUpdating}
                >
                  {isStatusUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    STATUS_ACTION_LABELS[action]
                  )}
                </Button>
              ))}
            </div>
          )}
          {onEdit && isAdmin && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(mission)}
              disabled={disableActions}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          )}
          {onDelete && isAdmin && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => onDelete(mission.mission_id)}
              disabled={disableActions}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
          <Button
            asChild
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <Link href={`/missions/${mission.mission_id}`}>
              <MapPinned className="h-4 w-4" />
              View details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
