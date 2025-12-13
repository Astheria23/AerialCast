"use client"

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import { Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { Drone } from "@/types/drones.types"
import type { MaintenanceAssignee, MaintenanceLog, MaintenanceStatus } from "@/types/maintenance.types"

export interface MaintenanceLogFormPayload {
  drone_id: string
  notes: string
  scheduled_for: string
  assigned_pilot_id: string
  status: MaintenanceStatus
}

interface MaintenanceLogFormProps {
  drones: Drone[]
  pilots: MaintenanceAssignee[]
  mode: "create" | "edit"
  initialData?: MaintenanceLog | null
  onSubmit: (payload: MaintenanceLogFormPayload) => Promise<void> | void
  onCancel?: () => void
  isSubmitting?: boolean
  error?: string | null
  canAssignPilot?: boolean
  canEditSchedule?: boolean
  canEditStatus?: boolean
  canEditNotes?: boolean
}

const STATUS_OPTIONS: { value: MaintenanceStatus; label: string }[] = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
]

export function MaintenanceLogForm({
  drones,
  pilots,
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
  canAssignPilot = false,
  canEditSchedule = false,
  canEditStatus = false,
  canEditNotes = true,
}: MaintenanceLogFormProps) {
  const [values, setValues] = useState({
    drone_id: initialData?.drone_id ?? "",
    notes: initialData?.notes ?? "",
    scheduled_for: initialData?.scheduled_for?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    assigned_pilot_id: initialData?.assigned_pilot_id ?? "",
    status: initialData?.status ?? "SCHEDULED",
  })

  const droneOptions = useMemo(() => drones.map((drone) => ({ value: drone.drone_id, label: `${drone.name} (${drone.model})` })), [drones])
  const pilotOptions = useMemo(() => pilots.map((pilot) => ({ value: pilot.user_id, label: pilot.full_name })), [pilots])
  const resolvedAssignedPilotId = values.assigned_pilot_id || (mode === "create" ? pilotOptions[0]?.value ?? "" : "")

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!values.drone_id || !values.notes.trim() || !resolvedAssignedPilotId) {
      return
    }

    await onSubmit({
      drone_id: values.drone_id,
      notes: values.notes.trim(),
      scheduled_for: values.scheduled_for,
      assigned_pilot_id: resolvedAssignedPilotId,
      status: values.status as MaintenanceStatus,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="drone_id">Drone</Label>
          <select
            id="drone_id"
            name="drone_id"
            value={values.drone_id}
            onChange={handleChange}
            required
            disabled={isSubmitting || mode === "edit"}
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
        <div className="space-y-2">
          <Label htmlFor="scheduled_for">Scheduled date</Label>
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              id="scheduled_for"
              name="scheduled_for"
              value={values.scheduled_for}
              onChange={handleChange}
              disabled={isSubmitting || !canEditSchedule}
              className="h-10 w-full bg-transparent text-sm focus-visible:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="assigned_pilot_id">Assigned pilot</Label>
          <select
            id="assigned_pilot_id"
            name="assigned_pilot_id"
            value={resolvedAssignedPilotId}
            onChange={handleChange}
            required
            disabled={isSubmitting || !canAssignPilot}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select pilot</option>
            {pilotOptions.map((pilot) => (
              <option key={pilot.value} value={pilot.value}>
                {pilot.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            value={values.status}
            onChange={handleChange}
            disabled={isSubmitting || !canEditStatus}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Maintenance notes</Label>
        <textarea
          id="notes"
          name="notes"
          value={values.notes}
          onChange={handleChange}
          rows={4}
          placeholder="Describe the inspection, repairs, or actions taken"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
          disabled={isSubmitting || !canEditNotes}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
          {isSubmitting ? "Saving..." : mode === "create" ? "Log maintenance" : "Save changes"}
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
