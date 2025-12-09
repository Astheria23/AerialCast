"use client"

import Image from "next/image"

import { Drone } from "@/types/drones.types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Eye } from "lucide-react"
import { format } from "date-fns"
import { useAuth } from "@/hooks/auth.hooks"

interface DroneCardProps {
  drone: Drone
  onEdit?: (drone: Drone) => void
  onDelete?: (droneId: string) => void
  onViewDetail?: (drone: Drone) => void
}

export function DroneCard({ drone, onEdit, onDelete, onViewDetail }: DroneCardProps) {
  const { isAdmin, isPilot } = useAuth()
  const imageUrl = drone.specs?.image_url ?? undefined
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {imageUrl && (
        <div className="relative h-40 w-full bg-muted">
          <Image
            src={imageUrl}
            alt={`${drone.name} image`}
            fill
            className="object-cover"
            sizes="(min-width: 768px) 33vw, 100vw"
            priority={false}
          />
        </div>
      )}
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
        <div className="text-sm">
          <p className="text-muted-foreground text-xs">Created</p>
          <p className="text-sm mt-1">
            {format(new Date(drone.created_at), "dd MMM yyyy HH:mm")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {drone.specs?.flight_controller && (
            <div>
              <p className="text-muted-foreground uppercase tracking-wide">Flight controller</p>
              <p className="mt-1 font-medium text-foreground">{drone.specs.flight_controller}</p>
            </div>
          )}
          {drone.specs?.motor && (
            <div>
              <p className="text-muted-foreground uppercase tracking-wide">Motor</p>
              <p className="mt-1 font-medium text-foreground">{drone.specs.motor}</p>
            </div>
          )}
          {drone.specs?.battery && (
            <div>
              <p className="text-muted-foreground uppercase tracking-wide">Battery</p>
              <p className="mt-1 font-medium text-foreground">{drone.specs.battery}</p>
            </div>
          )}
          {typeof drone.specs?.max_flight_time_min === "number" && (
            <div>
              <p className="text-muted-foreground uppercase tracking-wide">Max flight time</p>
              <p className="mt-1 font-medium text-foreground">{drone.specs.max_flight_time_min} min</p>
            </div>
          )}
        </div>
        {drone.specs?.additional_info && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {drone.specs.additional_info}
          </p>
        )}
      </CardContent>
      <div className="px-6 py-3 bg-muted/50 flex gap-2 justify-end">
        {isAdmin && onEdit && (
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
        {isAdmin && onDelete && (
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
        {isPilot && onViewDetail && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewDetail(drone)}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            See Detail
          </Button>
        )}
      </div>
    </Card>
  )
}
