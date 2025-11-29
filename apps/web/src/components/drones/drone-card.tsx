"use client"

import { Drone } from "@/types/drones.types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Edit } from "lucide-react"
import { format } from "date-fns"

interface DroneCardProps {
  drone: Drone
  onEdit?: (drone: Drone) => void
  onDelete?: (droneId: string) => void
}

export function DroneCard({ drone, onEdit, onDelete }: DroneCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle>{drone.name}</CardTitle>
            <CardDescription>{drone.model}</CardDescription>
          </div>
          {drone.status && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              {drone.status}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Drone ID</p>
            <p className="font-mono text-xs mt-1 truncate">{drone.drone_id}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">LoRa ID</p>
            <p className="font-mono text-xs mt-1 truncate">{drone.lora_id}</p>
          </div>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Created</p>
          <p className="text-sm mt-1">
            {format(new Date(drone.created_at), "dd MMM yyyy HH:mm")}
          </p>
        </div>
      </CardContent>
      <div className="px-6 py-3 bg-muted/50 flex gap-2 justify-end">
        {onEdit && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(drone)}
            className="gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        )}
        {onDelete && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(drone.drone_id)}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        )}
      </div>
    </Card>
  )
}
