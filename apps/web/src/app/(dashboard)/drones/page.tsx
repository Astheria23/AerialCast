"use client"

import { useEffect, useState } from "react"
import { Plus, Loader2 } from "lucide-react"

import { DroneCard } from "@/components/drones/drone-card"
import { DroneDetailsDialog } from "@/components/drones/drone-details-dialog"
import { DroneUpsertDialog } from "@/components/drones/drone-upsert-dialog"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { Button } from "@/components/ui/button"
import { ErrorDialog } from "@/components/ui/error-dialog"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/auth.hooks"
import { useDrones } from "@/hooks/drones.hooks"
import { getFriendlyErrorMessage } from "@/lib/errors"
import type { Drone, DroneSpecsInput } from "@/types/drones.types"

export default function DronesPage() {
  const {
    drones,
    loading,
    error,
    clearError,
    fetchDrones,
    deleteDrone,
    createDrone,
    updateDrone,
  } = useDrones()
  const { isAdmin } = useAuth()
  const { toast } = useToast()
  const [transientError, setTransientError] = useState<string | null>(null)
  const [isDialogOpen, setDialogOpen] = useState(false)
  const [editingDrone, setEditingDrone] = useState<Drone | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [detailsDrone, setDetailsDrone] = useState<Drone | null>(null)
  const [isDetailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    fetchDrones().catch(() => null)
  }, [fetchDrones])

  const handleDelete = async (droneId: string) => {
    if (confirm("Are you sure you want to delete this drone?")) {
      try {
        await deleteDrone(droneId)
        toast({
          title: "Drone removed",
          description: "The drone has been deleted from your fleet.",
        })
      } catch (err) {
        const message = getFriendlyErrorMessage(err, "Failed to delete drone")
        setTransientError(message)
        toast({
          variant: "destructive",
          title: "Unable to delete drone",
          description: message,
        })
      }
    }
  }

  const handleOpenCreate = () => {
    setEditingDrone(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (drone: Drone) => {
    setEditingDrone(drone)
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingDrone(null)
  }

  const handleViewDetails = (drone: Drone) => {
    setDetailsDrone(drone)
    setDetailsOpen(true)
  }

  const handleDetailsClose = () => {
    setDetailsOpen(false)
    setDetailsDrone(null)
  }

  const handleDetailsOpenChange = (open: boolean) => {
    if (!open) {
      handleDetailsClose()
    } else {
      setDetailsOpen(true)
    }
  }

  const handleUpsert = async (payload: {
    drone_id?: string
    name: string
    model: string
    lora_id: string
    specs?: DroneSpecsInput
  }) => {
    if (!isAdmin) return
    setIsSubmitting(true)
    try {
      if (payload.drone_id) {
        await updateDrone(payload.drone_id, {
          name: payload.name,
          model: payload.model,
          lora_id: payload.lora_id,
          specs: payload.specs,
        })
      } else {
        await createDrone({
          name: payload.name,
          model: payload.model,
          lora_id: payload.lora_id,
          specs: payload.specs,
        })
      }
      toast({
        title: payload.drone_id ? "Drone updated" : "Drone created",
        description: payload.drone_id
          ? "Changes were saved successfully."
          : "The aircraft has been added to your fleet.",
      })
      handleDialogClose()
    } catch (err) {
      const message = getFriendlyErrorMessage(
        err,
        payload.drone_id ? "Failed to update drone" : "Failed to create drone",
      )
      setTransientError(message)
      toast({
        variant: "destructive",
        title: payload.drone_id ? "Unable to update drone" : "Unable to create drone",
        description: message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const aggregatedError = transientError ?? error ?? null

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Drones" },
            ]}
          />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Drones</h1>
            <p className="text-muted-foreground mt-1">
              Manage and monitor your drone fleet
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button className="gap-2" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4" />
            Add Drone
          </Button>
        )}
      </div>

      <ErrorDialog
        open={Boolean(aggregatedError)}
        message={aggregatedError ?? undefined}
        onOpenChange={(open) => {
          if (!open) {
            setTransientError(null)
            clearError()
          }
        }}
      />

      {/* Loading State */}
      {loading && drones.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading drones...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && drones.length === 0 && (
        <div className="flex items-center justify-center py-12 border-2 border-dashed rounded-lg">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No drones found</p>
            {isAdmin && (
              <Button className="gap-2" onClick={handleOpenCreate}>
                <Plus className="w-4 h-4" />
                Add your first drone
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Drones Grid */}
      {drones.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drones.map((drone) => (
            <DroneCard
              key={drone.drone_id}
              drone={drone}
              onEdit={isAdmin ? () => handleOpenEdit(drone) : undefined}
              onDelete={isAdmin ? handleDelete : undefined}
              onViewDetail={() => handleViewDetails(drone)}
            />
          ))}
        </div>
      )}

      {isAdmin && (
        <DroneUpsertDialog
          open={isDialogOpen}
          onClose={handleDialogClose}
          onSubmit={handleUpsert}
          isSubmitting={isSubmitting}
          initialData={editingDrone}
        />
      )}

      <DroneDetailsDialog drone={detailsDrone} open={isDetailsOpen} onOpenChange={handleDetailsOpenChange} />
    </div>
  )
}
