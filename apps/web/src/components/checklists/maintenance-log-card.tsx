"use client"

import { format } from "date-fns"
import { CalendarDays, Edit, Trash2, UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { MaintenanceLog } from "@/types/maintenance.types"

interface MaintenanceLogCardProps {
  log: MaintenanceLog
  droneName?: string
  onEdit?: (log: MaintenanceLog) => void
  onDelete?: (logId: string) => void
  disableActions?: boolean
}

export function MaintenanceLogCard({ log, droneName, onEdit, onDelete, disableActions }: MaintenanceLogCardProps) {
  const formattedDate = log.log_date ? format(new Date(log.log_date), "dd MMM yyyy") : "—"
  const technician = log.serviced_by_name || "Technician"

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>{droneName || log.drone_id}</span>
          <span className="text-sm font-normal text-muted-foreground">{formattedDate}</span>
        </CardTitle>
        <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserRound className="h-4 w-4" />
          <span>{technician}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          {log.notes || "No maintenance notes provided."}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex flex-wrap gap-2">
            {onEdit && (
              <Button type="button" variant="outline" size="sm" onClick={() => onEdit(log)} disabled={disableActions}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(log.log_id)} disabled={disableActions}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Logged on {formattedDate}</span>
        </div>
      </CardContent>
    </Card>
  )
}
