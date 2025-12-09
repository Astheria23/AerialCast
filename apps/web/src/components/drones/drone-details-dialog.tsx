"use client"

import Image from "next/image"
import { format } from "date-fns"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Drone } from "@/types/drones.types"

interface DroneDetailsDialogProps {
  drone: Drone | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DroneDetailsDialog({ drone, open, onOpenChange }: DroneDetailsDialogProps) {
  const specs = drone?.specs

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {drone ? (
          <>
            <DialogHeader>
              <DialogTitle>{drone.name}</DialogTitle>
              <DialogDescription>
                Detailed specifications and metadata for this aircraft.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-6 md:grid-cols-[1.2fr_1fr]">
              <div className="space-y-6">
                {specs?.image_url && (
                  <div className="relative aspect-square w-full overflow-hidden rounded-md border">
                    <Image src={specs.image_url} alt={`${drone.name} photo`} fill className="object-cover" />
                  </div>
                )}
                <div className="grid gap-3">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">Identifiers</h3>
                  <div className="grid gap-2">
                    <DetailRow label="Drone ID" value={drone.drone_id} mono />
                    <DetailRow label="LoRa ID" value={drone.lora_id} mono />
                    {drone.status && <DetailRow label="Status" value={drone.status} />}
                    <DetailRow
                      label="Created"
                      value={format(new Date(drone.created_at), "dd MMM yyyy HH:mm")}
                    />
                  </div>
                </div>
                {specs?.additional_info && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">
                      Notes
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{specs.additional_info}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">
                    Core specs
                  </h3>
                  <div className="grid gap-3 text-sm">
                    <DetailRow label="Model" value={drone.model} />
                    <DetailRow label="Flight controller" value={specs?.flight_controller} />
                    <DetailRow label="Motor" value={specs?.motor} />
                    <DetailRow label="ESC" value={specs?.esc} />
                    <DetailRow label="Propeller" value={specs?.propeller} />
                    <DetailRow label="Battery" value={specs?.battery} />
                    <DetailRow label="GPS module" value={specs?.gps_module} />
                    {typeof specs?.weight_g === "number" && (
                      <DetailRow label="Weight" value={`${specs.weight_g} g`} />
                    )}
                    {typeof specs?.max_flight_time_min === "number" && (
                      <DetailRow label="Max flight time" value={`${specs.max_flight_time_min} min`} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value?: string | null
  mono?: boolean
}) {
  if (!value || value.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : "text-sm"}>{value}</span>
    </div>
  )
}
