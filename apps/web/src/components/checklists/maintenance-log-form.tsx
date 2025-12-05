"use client"

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import { Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { Drone } from "@/types/drones.types"
import type { MaintenanceLog } from "@/types/maintenance.types"

export interface MaintenanceLogFormPayload {
  drone_id: string
  notes: string
  log_date: string
}

interface MaintenanceLogFormProps {
  drones: Drone[]
  mode: "create" | "edit"
  initialData?: MaintenanceLog | null
  onSubmit: (payload: MaintenanceLogFormPayload) => Promise<void> | void
  onCancel?: () => void
  isSubmitting?: boolean
  error?: string | null
}

export function MaintenanceLogForm({ drones, mode, initialData, onSubmit, onCancel, isSubmitting, error }: MaintenanceLogFormProps) {
  const [values, setValues] = useState({
    drone_id: initialData?.drone_id ?? "",
    notes: initialData?.notes ?? "",
    log_date: initialData?.log_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  })

  const droneOptions = useMemo(() => drones.map((drone) => ({ value: drone.drone_id, label: `${drone.name} (${drone.model})` })), [drones])

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!values.drone_id || !values.notes.trim()) {
      return
    }

    await onSubmit({
      drone_id: values.drone_id,
      notes: values.notes.trim(),
      log_date: values.log_date,
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
          <Label htmlFor="log_date">Log date</Label>
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              id="log_date"
              name="log_date"
              value={values.log_date}
              onChange={handleChange}
              disabled={isSubmitting}
              className="h-10 w-full bg-transparent text-sm focus-visible:outline-none"
            />
          </div>
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
          disabled={isSubmitting}
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
