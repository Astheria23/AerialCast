"use client"

import dynamic from "next/dynamic"
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Drone } from "@/types/drones.types"
import type { Mission, MissionStatus, MissionWaypoint } from "@/types/missions.types"

const STATUS_OPTIONS: MissionStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELED",
]

interface WaypointFormValue {
  latitude: string
  longitude: string
  altitude: string
}

const defaultWaypoint: WaypointFormValue = {
  latitude: "",
  longitude: "",
  altitude: "15",
}

export interface MissionFormPayload {
  mission_name: string
  drone_id: string
  notes?: string
  save_as_draft?: boolean
  status?: MissionStatus | string
  waypoints: MissionWaypoint[]
}

const MissionWaypointsMap = dynamic(() => import("./mission-waypoints-map"), { ssr: false })

interface MissionFormProps {
  drones: Drone[]
  mode: "create" | "edit"
  initialData?: Mission | null
  onSubmit: (payload: MissionFormPayload) => Promise<void> | void
  onCancel?: () => void
  isSubmitting?: boolean
  error?: string | null
}

export function MissionForm({ drones, mode, initialData, onSubmit, onCancel, isSubmitting, error }: MissionFormProps) {
  const [values, setValues] = useState({
    mission_name: initialData?.mission_name ?? "",
    drone_id: initialData?.drone_id ?? "",
    notes: initialData?.notes ?? "",
    save_as_draft: initialData?.status === "DRAFT" || !!initialData?.save_as_draft,
    status: initialData?.status ?? "DRAFT",
  })

  const [waypoints, setWaypoints] = useState<WaypointFormValue[]>(() => {
    if (initialData?.waypoints?.length) {
      return [...initialData.waypoints]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((wp) => ({
        latitude: String(wp.latitude ?? ""),
        longitude: String(wp.longitude ?? ""),
        altitude: String(wp.altitude ?? ""),
      }))
    }
    return [{ ...defaultWaypoint }]
  })

  const numericWaypoints = useMemo(
    () =>
      waypoints
        .map((wp, idx) => {
          const latitude = parseFloat(wp.latitude)
          const longitude = parseFloat(wp.longitude)
          if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
            return null
          }
          return {
            latitude,
            longitude,
            order: idx,
          }
        })
        .filter(Boolean) as { latitude: number; longitude: number; order: number }[],
    [waypoints]
  )

  const droneOptions = useMemo(() => drones.map((drone) => ({ value: drone.drone_id, label: `${drone.name} (${drone.model})` })), [drones])

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target
    const nextValue = type === "checkbox" ? (event.target as HTMLInputElement).checked : value
    setValues((prev) => ({
      ...prev,
      [name]: nextValue,
    }))
  }

  const handleWaypointChange = (index: number, field: keyof WaypointFormValue, value: string) => {
    setWaypoints((prev) => prev.map((wp, idx) => (idx === index ? { ...wp, [field]: value } : wp)))
  }

  const handleAddWaypoint = () => {
    setWaypoints((prev) => [...prev, { ...defaultWaypoint }])
  }

  const handleRemoveWaypoint = (index: number) => {
    setWaypoints((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)))
  }

  const handleMapClick = ({ lat, lng }: { lat: number; lng: number }) => {
    setWaypoints((prev) => [
      ...prev,
      {
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        altitude: defaultWaypoint.altitude,
      },
    ])
  }

  const handleClearWaypoints = () => {
    setWaypoints([{ ...defaultWaypoint }])
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!values.mission_name.trim() || !values.drone_id) {
      return
    }

    const preparedWaypoints: MissionWaypoint[] = waypoints
      .map((wp, idx) => ({
        latitude: parseFloat(wp.latitude),
        longitude: parseFloat(wp.longitude),
        altitude: wp.altitude ? parseFloat(wp.altitude) : undefined,
        order: idx,
      }))
      .filter((wp) => !Number.isNaN(wp.latitude) && !Number.isNaN(wp.longitude))

    if (!preparedWaypoints.length) {
      return
    }

    await onSubmit({
      mission_name: values.mission_name.trim(),
      drone_id: values.drone_id,
      notes: values.notes?.trim() || undefined,
      save_as_draft: values.save_as_draft,
      status: mode === "edit" ? values.status : undefined,
      waypoints: preparedWaypoints,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mission_name">Mission Name</Label>
          <Input
            id="mission_name"
            name="mission_name"
            value={values.mission_name}
            onChange={handleChange}
            placeholder="Urban Survey"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="drone_id">Assigned Drone</Label>
          <select
            id="drone_id"
            name="drone_id"
            value={values.drone_id}
            onChange={handleChange}
            required
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select drone</option>
            {droneOptions.map((drone) => (
              <option key={drone.value} value={drone.value}>
                {drone.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          value={values.notes}
          onChange={handleChange}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Operational notes or objectives"
        />
      </div>

      <div className="space-y-4">
        <div className="space-y-3 rounded-xl border border-dashed p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Label>Map waypoints</Label>
              <p className="text-xs text-muted-foreground">Click on the map to add waypoints. The first click is order 0.</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={handleAddWaypoint}>
                Add manually
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleClearWaypoints}>
                Clear
              </Button>
            </div>
          </div>
          <div className="h-72 w-full overflow-hidden rounded-lg border">
            <MissionWaypointsMap waypoints={numericWaypoints} onMapClick={handleMapClick} />
          </div>
        </div>

        <div className="space-y-4">
          {waypoints.map((waypoint, index) => (
            <div key={`waypoint-${index}`} className="space-y-3 rounded-lg border border-dashed p-4">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Waypoint #{index}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveWaypoint(index)} disabled={waypoints.length === 1}>
                  Remove
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={waypoint.latitude}
                    onChange={(event) => handleWaypointChange(index, "latitude", event.target.value)}
                    placeholder="-6.200000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={waypoint.longitude}
                    onChange={(event) => handleWaypointChange(index, "longitude", event.target.value)}
                    placeholder="106.816700"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Altitude (m)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={waypoint.altitude}
                    onChange={(event) => handleWaypointChange(index, "altitude", event.target.value)}
                    placeholder="15"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="save_as_draft"
            checked={values.save_as_draft}
            onChange={handleChange}
            className="h-4 w-4"
          />
          Save as draft
        </label>

        {mode === "edit" && (
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              value={values.status}
              onChange={handleChange}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
          {isSubmitting ? "Saving..." : mode === "create" ? "Create mission" : "Save changes"}
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
