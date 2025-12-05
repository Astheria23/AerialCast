"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Drone } from "@/types/drones.types"
import type { DroneStatus } from "@/types/enums"

const DRONE_STATUS_OPTIONS: DroneStatus[] = ["READY", "MAINTENANCE", "FLYING", "RETIRED"]

export interface DroneFormValues {
  name: string
  model: string
  lora_id: string
  status?: DroneStatus
}

interface DroneFormProps {
  mode: "create" | "edit"
  initialData?: Drone | null
  onSubmit: (values: DroneFormValues) => Promise<void> | void
  onCancel?: () => void
  isSubmitting?: boolean
  error?: string | null
}

const defaultValues: DroneFormValues = {
  name: "",
  model: "",
  lora_id: "",
  status: "READY",
}

export function DroneForm({ mode, initialData, onSubmit, onCancel, isSubmitting, error }: DroneFormProps) {
  const [values, setValues] = useState<DroneFormValues>(() => ({
    name: initialData?.name ?? defaultValues.name,
    model: initialData?.model ?? defaultValues.model,
    lora_id: initialData?.lora_id ?? defaultValues.lora_id,
    status: initialData?.status ?? defaultValues.status,
  }))

  const handleChange = (field: keyof DroneFormValues) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setValues((prev) => ({
      ...prev,
      [field]: event.target.value,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={values.name}
            onChange={handleChange("name")}
            placeholder="Aerial Scout"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={values.model}
            onChange={handleChange("model")}
            placeholder="DJI M300"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lora_id">LoRa ID</Label>
          <Input
            id="lora_id"
            value={values.lora_id}
            onChange={handleChange("lora_id")}
            placeholder="LORA-001"
            required
          />
        </div>
        {mode === "edit" && (
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={values.status}
              onChange={handleChange("status")}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {DRONE_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
          {isSubmitting ? "Saving..." : mode === "create" ? "Create Drone" : "Save Changes"}
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
