"use client"

import Link from "next/link"
import { format } from "date-fns"
import { Edit, Loader2, MapPin, MapPinned, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Mission, MissionStatusAction } from "@/types/missions.types"

interface MissionCardProps {
  mission: Mission
  droneName?: string
  onEdit?: (mission: Mission) => void
  onDelete?: (missionId: string) => void
  onStatusAction?: (mission: Mission, action: MissionStatusAction) => void
  canPerformAction?: (action: MissionStatusAction) => boolean
  disableActions?: boolean
  isStatusUpdating?: boolean
}

const statusClasses: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-800",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
  IN_PROGRESS: "bg-sky-100 text-sky-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELED: "bg-zinc-100 text-zinc-800",
}

const statusActionMap: Partial<Record<string, MissionStatusAction[]>> = {
  DRAFT: ["submit", "cancel"],
  PENDING_APPROVAL: ["approve", "reject", "cancel"],
  APPROVED: ["start", "cancel"],
  IN_PROGRESS: ["complete", "cancel"],
}

const statusActionLabels: Record<MissionStatusAction, string> = {
  submit: "Submit",
  approve: "Approve",
  reject: "Reject",
  start: "Start",
  complete: "Complete",
  cancel: "Cancel",
}

export function MissionCard({
  mission,
  droneName,
  onEdit,
  onDelete,
  onStatusAction,
  canPerformAction,
  disableActions,
  isStatusUpdating,
}: MissionCardProps) {
  const formattedDate = mission.created_at ? format(new Date(mission.created_at), "dd MMM yyyy HH:mm") : ""
  const status = mission.status || "DRAFT"
  const statusClass = statusClasses[status] ?? "bg-slate-100 text-slate-800"
  const availableActions = statusActionMap[status] ?? []
  const filteredActions = availableActions.filter((action) => (canPerformAction ? canPerformAction(action) : true))

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{mission.mission_name}</CardTitle>
          <CardDescription className="mt-1">{mission.notes || "No notes"}</CardDescription>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
          {status.replace(/_/g, " ")}
        </span>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Drone</p>
          <p className="font-medium">{droneName || mission.drone_id}</p>
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
        <div className="flex flex-wrap gap-2">
          {filteredActions.length > 0 && onStatusAction && (
            <div className="flex flex-wrap gap-2">
              {filteredActions.map((action) => (
                <Button
                  key={action}
                  type="button"
                  variant={action === "cancel" || action === "reject" ? "destructive" : "secondary"}
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
                    statusActionLabels[action]
                  )}
                </Button>
              ))}
            </div>
          )}
          {onEdit && (
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
          {onDelete && (
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
          <Button asChild type="button" variant="ghost" size="sm" className="gap-2">
            <Link href={`/missions/${mission.mission_id}`}>
              <MapPinned className="h-4 w-4" />
              View details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
