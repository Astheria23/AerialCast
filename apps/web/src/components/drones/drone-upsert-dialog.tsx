"use client"

import Image from "next/image"
import { useState, useMemo, type FormEvent, type ChangeEvent } from "react"
import { Loader2, Upload, X } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { Drone, DroneSpecsInput } from "@/types/drones.types"

interface DroneUpsertDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: {
    drone_id?: string
    name: string
    model: string
    lora_id: string
    specs?: DroneSpecsInput
  }) => Promise<void> | void
  isSubmitting?: boolean
  initialData?: Drone | null
}

export function DroneUpsertDialog({ open, onClose, onSubmit, isSubmitting, initialData }: DroneUpsertDialogProps) {
  const [formValues, setFormValues] = useState(() => ({
    name: initialData?.name ?? "",
    model: initialData?.model ?? "",
    lora_id: initialData?.lora_id ?? "",
    specs: {
      flight_controller: initialData?.specs?.flight_controller ?? "",
      motor: initialData?.specs?.motor ?? "",
      esc: initialData?.specs?.esc ?? "",
      propeller: initialData?.specs?.propeller ?? "",
      battery: initialData?.specs?.battery ?? "",
      gps_module: initialData?.specs?.gps_module ?? "",
      weight_g: initialData?.specs?.weight_g ?? undefined,
      max_flight_time_min: initialData?.specs?.max_flight_time_min ?? undefined,
      additional_info: initialData?.specs?.additional_info ?? "",
      image_base64: null as string | null,
    } satisfies DroneSpecsInput,
  }))
  const [preview, setPreview] = useState<string | null>(initialData?.specs?.image_url ?? null)

  const dialogTitle = initialData ? "Edit drone" : "Add drone"
  const dialogDescription = initialData
    ? "Update fleet information, specifications, or aircraft imagery."
    : "Register a new aircraft with its specification details and optional photo."

  const isValid = useMemo(
    () =>
      formValues.name.trim().length > 0 &&
      formValues.model.trim().length > 0 &&
      formValues.lora_id.trim().length > 0,
    [formValues],
  )

  const resetForm = () => {
    setFormValues({
      name: initialData?.name ?? "",
      model: initialData?.model ?? "",
      lora_id: initialData?.lora_id ?? "",
      specs: {
        flight_controller: initialData?.specs?.flight_controller ?? "",
        motor: initialData?.specs?.motor ?? "",
        esc: initialData?.specs?.esc ?? "",
        propeller: initialData?.specs?.propeller ?? "",
        battery: initialData?.specs?.battery ?? "",
        gps_module: initialData?.specs?.gps_module ?? "",
        weight_g: initialData?.specs?.weight_g ?? undefined,
        max_flight_time_min: initialData?.specs?.max_flight_time_min ?? undefined,
        additional_info: initialData?.specs?.additional_info ?? "",
        image_base64: null,
      },
    })
    setPreview(initialData?.specs?.image_url ?? null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
      onClose()
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSpecsChange = (field: keyof DroneSpecsInput, value: string | number | null) => {
    setFormValues((prev) => ({
      ...prev,
      specs: {
        ...prev.specs,
        [field]: value === "" ? null : value,
      },
    }))
  }

  const handleImageUpload = (file: File | null) => {
    if (!file) {
      setFormValues((prev) => ({
        ...prev,
        specs: {
          ...prev.specs,
          image_base64: null,
        },
      }))
      setPreview(initialData?.specs?.image_url ?? null)
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result
      if (typeof result === "string") {
        setFormValues((prev) => ({
          ...prev,
          specs: {
            ...prev.specs,
            image_base64: result,
          },
        }))
        setPreview(result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isValid || isSubmitting) return

    const specsInput = formValues.specs

    const parseNumberField = (value: unknown): number | undefined => {
      if (typeof value === "number") {
        return Number.isNaN(value) ? undefined : value
      }
      if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value)
        return Number.isNaN(parsed) ? undefined : parsed
      }
      return undefined
    }

    const sanitizeStringField = (value: unknown): string | undefined => {
      if (typeof value !== "string") {
        return undefined
      }
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : undefined
    }

    const specsPayload: Partial<DroneSpecsInput> = {}

    const flightController = sanitizeStringField(specsInput.flight_controller)
    if (flightController !== undefined) {
      specsPayload.flight_controller = flightController
    }

    const motor = sanitizeStringField(specsInput.motor)
    if (motor !== undefined) {
      specsPayload.motor = motor
    }

    const escValue = sanitizeStringField(specsInput.esc)
    if (escValue !== undefined) {
      specsPayload.esc = escValue
    }

    const propeller = sanitizeStringField(specsInput.propeller)
    if (propeller !== undefined) {
      specsPayload.propeller = propeller
    }

    const battery = sanitizeStringField(specsInput.battery)
    if (battery !== undefined) {
      specsPayload.battery = battery
    }

    const gpsModule = sanitizeStringField(specsInput.gps_module)
    if (gpsModule !== undefined) {
      specsPayload.gps_module = gpsModule
    }

    const weight = parseNumberField(specsInput.weight_g)
    if (weight !== undefined) {
      specsPayload.weight_g = weight
    }

    const maxFlightTime = parseNumberField(specsInput.max_flight_time_min)
    if (maxFlightTime !== undefined) {
      specsPayload.max_flight_time_min = maxFlightTime
    }

    const additionalInfo = sanitizeStringField(specsInput.additional_info)
    if (additionalInfo !== undefined) {
      specsPayload.additional_info = additionalInfo
    }

    if (typeof specsInput.image_base64 === "string" && specsInput.image_base64.trim().length > 0) {
      specsPayload.image_base64 = specsInput.image_base64
    }

    const payload = {
      drone_id: initialData?.drone_id,
      name: formValues.name.trim(),
      model: formValues.model.trim(),
      lora_id: formValues.lora_id.trim(),
      ...(Object.keys(specsPayload).length > 0 ? { specs: specsPayload } : {}),
    }

    onSubmit(payload)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formValues.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  placeholder="E.g. Falcon A1"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  name="model"
                  value={formValues.model}
                  onChange={(event) => handleChange("model", event.target.value)}
                  placeholder="E.g. DJI Matrice"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lora_id">LoRa ID</Label>
                <Input
                  id="lora_id"
                  name="lora_id"
                  value={formValues.lora_id}
                  onChange={(event) => handleChange("lora_id", event.target.value)}
                  placeholder="Unique LoRa address"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Aircraft photo</Label>
              <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                {preview ? (
                  <div className="relative h-40 w-full overflow-hidden rounded-md border">
                    <Image src={preview} alt="Drone preview" fill className="object-cover" />
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute right-2 top-2 h-7 w-7"
                      onClick={() => handleImageUpload(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8" />
                    <p>Upload a JPG/PNG image</p>
                  </>
                )}
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => handleImageUpload(event.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="flight_controller">Flight controller</Label>
              <Input
                id="flight_controller"
                value={formValues.specs.flight_controller ?? ""}
                onChange={(event) => handleSpecsChange("flight_controller", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="motor">Motor</Label>
              <Input
                id="motor"
                value={formValues.specs.motor ?? ""}
                onChange={(event) => handleSpecsChange("motor", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="esc">ESC</Label>
              <Input
                id="esc"
                value={formValues.specs.esc ?? ""}
                onChange={(event) => handleSpecsChange("esc", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="propeller">Propeller</Label>
              <Input
                id="propeller"
                value={formValues.specs.propeller ?? ""}
                onChange={(event) => handleSpecsChange("propeller", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="battery">Battery</Label>
              <Input
                id="battery"
                value={formValues.specs.battery ?? ""}
                onChange={(event) => handleSpecsChange("battery", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gps_module">GPS module</Label>
              <Input
                id="gps_module"
                value={formValues.specs.gps_module ?? ""}
                onChange={(event) => handleSpecsChange("gps_module", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="weight_g">Weight (g)</Label>
              <Input
                id="weight_g"
                type="number"
                min="0"
                value={formValues.specs.weight_g ?? ""}
                onChange={(event) => handleSpecsChange("weight_g", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="max_flight_time_min">Max flight time (minutes)</Label>
              <Input
                id="max_flight_time_min"
                type="number"
                min="0"
                value={formValues.specs.max_flight_time_min ?? ""}
                onChange={(event) => handleSpecsChange("max_flight_time_min", event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="additional_info">Additional information</Label>
            <textarea
              id="additional_info"
              rows={3}
              value={formValues.specs.additional_info ?? ""}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                handleSpecsChange("additional_info", event.target.value)
              }
              placeholder="Notes about payload capacity, sensors, or custom integrations"
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {initialData ? "Save changes" : "Create drone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
