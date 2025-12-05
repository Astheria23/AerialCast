"use client"

import dynamic from "next/dynamic"
import { useMemo, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CreateGeofencePayload, Geofence, GeofencePoint, GeofenceType } from "@/types/geofences.types"

const TYPE_OPTIONS: GeofenceType[] = ["SAFE_ZONE", "NO_FLY_ZONE"]

const GeofenceDrawingMap = dynamic(() => import("./geofence-drawing-map"), { ssr: false })

type PointFormValue = { latitude: string; longitude: string }

interface GeofenceFormProps {
  mode: "create" | "edit"
  initialData?: Geofence | null
  onSubmit: (payload: CreateGeofencePayload) => Promise<void> | void
  onCancel?: () => void
  isSubmitting?: boolean
  error?: string | null
}

export function GeofenceForm({ mode, initialData, onSubmit, onCancel, isSubmitting, error }: GeofenceFormProps) {
  const [values, setValues] = useState<{ area_name: string; type: GeofenceType }>({
    area_name: initialData?.area_name ?? "",
    type: initialData?.type ?? "SAFE_ZONE",
  })

  const [points, setPoints] = useState<PointFormValue[]>(() =>
    initialData?.points?.length
      ? [...initialData.points]
          .sort((a, b) => a.order - b.order)
          .map((point) => ({ latitude: String(point.latitude), longitude: String(point.longitude) }))
      : []
  )

  const [localError, setLocalError] = useState<string | null>(null)

  const numericPoints = useMemo(
    () =>
      points
        .map((point, index) => {
          const latitude = parseFloat(point.latitude)
          const longitude = parseFloat(point.longitude)
          if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
            return null
          }
          return { latitude, longitude, order: index }
        })
        .filter(Boolean) as GeofencePoint[],
    [points],
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!values.area_name.trim()) {
      setLocalError("Area name is required")
      return
    }
    if (numericPoints.length < 3) {
      setLocalError("Add at least 3 points to form a polygon")
      return
    }

    setLocalError(null)

    await onSubmit({
      area_name: values.area_name.trim(),
      type: values.type,
      points: numericPoints,
    })
  }

  const handlePointChange = (index: number, field: keyof PointFormValue, value: string) => {
    setPoints((prev) => prev.map((point, idx) => (idx === index ? { ...point, [field]: value } : point)))
  }

  const handleAddPoint = () => {
    setPoints((prev) => [...prev, { latitude: "", longitude: "" }])
  }

  const handleRemovePoint = (index: number) => {
    setPoints((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleMapClick = ({ lat, lng }: { lat: number; lng: number }) => {
    setPoints((prev) => [...prev, { latitude: lat.toFixed(6), longitude: lng.toFixed(6) }])
  }

  const handleClearPoints = () => setPoints([])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(error || localError) && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error || localError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="area_name">Area name</Label>
          <Input
            id="area_name"
            value={values.area_name}
            onChange={(event) => setValues((prev) => ({ ...prev, area_name: event.target.value }))}
            placeholder="Central Park Corridor"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Geofence type</Label>
          <select
            id="type"
            value={values.type}
            onChange={(event) => setValues((prev) => ({ ...prev, type: event.target.value as GeofenceType }))}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-dashed p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Label>Map drawing</Label>
            <p className="text-xs text-muted-foreground">Click on the map to drop polygon points in order. The first click marks point #0.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={handleAddPoint}>
              Add point manually
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleClearPoints}>
              Clear
            </Button>
          </div>
        </div>
        <div className="h-72 w-full overflow-hidden rounded-lg border">
          <GeofenceDrawingMap points={numericPoints} onMapClick={handleMapClick} />
        </div>
      </div>

      <div className="space-y-4">
        {points.length === 0 && <p className="text-sm text-muted-foreground">Start clicking on the map or add coordinates manually to define the boundary.</p>}
        {points.map((point, index) => (
          <div key={`point-${index}`} className="space-y-3 rounded-lg border border-dashed p-4">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Point #{index}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemovePoint(index)}>
                Remove
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={point.latitude}
                  onChange={(event) => handlePointChange(index, "latitude", event.target.value)}
                  placeholder="-6.200000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={point.longitude}
                  onChange={(event) => handlePointChange(index, "longitude", event.target.value)}
                  placeholder="106.816700"
                  required
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
  <Button type="submit" disabled={isSubmitting || numericPoints.length < 3} className="min-w-40">
          {isSubmitting ? "Saving..." : mode === "create" ? "Create geofence" : "Save geofence"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
