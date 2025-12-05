"use client"

import { format } from "date-fns"
import { Edit2, Map, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Geofence } from "@/types/geofences.types"
import { cn } from "@/lib/utils"

interface GeofenceCardProps {
  geofence: Geofence
  selected?: boolean
  onEdit?: (geofence: Geofence) => void
  onDelete?: (geofenceId: string) => void
  onFocus?: (geofenceId: string) => void
  disabled?: boolean
}

const typeStyles: Record<string, string> = {
  SAFE_ZONE: "bg-emerald-100 text-emerald-800",
  NO_FLY_ZONE: "bg-rose-100 text-rose-700",
}

export function GeofenceCard({ geofence, selected, onEdit, onDelete, onFocus, disabled }: GeofenceCardProps) {
  const createdLabel = geofence.created_at ? format(new Date(geofence.created_at), "dd MMM yyyy HH:mm") : ""
  const badgeClass = typeStyles[geofence.type] ?? "bg-slate-100 text-slate-800"

  return (
    <Card
      className={cn(
        "transition-all",
        selected ? "border-primary shadow-md" : "border-border",
        onFocus && "cursor-pointer",
      )}
      onClick={() => onFocus?.(geofence.geofence_id)}
      onMouseEnter={() => onFocus?.(geofence.geofence_id)}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{geofence.area_name}</CardTitle>
          <CardDescription className="mt-1 flex items-center gap-2 text-xs">
            <Map className="h-3.5 w-3.5" />
            {geofence.points.length} point{geofence.points.length === 1 ? "" : "s"}
          </CardDescription>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", badgeClass)}>
          {geofence.type.replace(/_/g, " ")}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {createdLabel && (
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="font-medium">{createdLabel}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {onEdit && (
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => onEdit(geofence)} disabled={disabled}>
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button type="button" variant="destructive" size="sm" className="gap-2" onClick={() => onDelete(geofence.geofence_id)} disabled={disabled}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
