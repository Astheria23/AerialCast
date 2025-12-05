"use client"

import { useMemo, useState } from "react"
import { Loader2, Plus } from "lucide-react"

import { DroneCard } from "@/components/drones/drone-card"
import { DroneForm, type DroneFormValues } from "@/components/drones/drone-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTelemetryContext } from "@/context/TelemetryContext"
import { useAuth } from "@/hooks/auth.hooks"
import { useDrones } from "@/hooks/drones.hooks"
import { parseApiError } from "@/utils/api-error"
import type { Drone } from "@/types/drones.types"

export default function DronesPage() {
  const {
    dronesQuery,
    createDrone,
    createDroneState,
    updateDrone,
    updateDroneState,
    deleteDrone,
    deleteDroneState,
  } = useDrones()
  const { isAdmin } = useAuth()
  const { connectionState } = useTelemetryContext()
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null)
  const [editingDrone, setEditingDrone] = useState<Drone | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const drones = dronesQuery.data ?? []
  const errorMessage = useMemo(() => {
    if (!dronesQuery.error) return null
    return parseApiError(dronesQuery.error).message
  }, [dronesQuery.error])

  const isInitialLoading = dronesQuery.isLoading && !drones.length
  const isDeleteDisabled = deleteDroneState.isPending

  const openCreateForm = () => {
    setFormMode("create")
    setEditingDrone(null)
    setFormError(null)
  }

  const openEditForm = (drone: Drone) => {
    setFormMode("edit")
    setEditingDrone(drone)
    setFormError(null)
  }

  const closeForm = () => {
    setFormMode(null)
    setEditingDrone(null)
    setFormError(null)
  }

  const handleCreateSubmit = async (values: DroneFormValues) => {
    try {
      setFormError(null)
      await createDrone({
        name: values.name.trim(),
        model: values.model.trim(),
        lora_id: values.lora_id.trim(),
      })
      closeForm()
    } catch (error) {
      const { message } = parseApiError(error)
      setFormError(message)
    }
  }

  const handleEditSubmit = async (values: DroneFormValues) => {
    if (!editingDrone) return
    try {
      setFormError(null)
      await updateDrone(editingDrone.drone_id, {
        name: values.name.trim(),
        model: values.model.trim(),
        lora_id: values.lora_id.trim(),
        status: values.status,
      })
      closeForm()
    } catch (error) {
      const { message } = parseApiError(error)
      setFormError(message)
    }
  }

  const handleDelete = async (droneId: string) => {
    if (isDeleteDisabled) return
    if (confirm("Are you sure you want to delete this drone?")) {
      try {
        await deleteDrone(droneId)
      } catch (err) {
        console.error("Failed to delete drone:", err)
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Drones</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your drone fleet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Telemetry connection: <span className="font-medium capitalize">{connectionState}</span>
          </p>
        </div>
        {isAdmin && (
          <Button className="gap-2" onClick={openCreateForm}>
            <Plus className="w-4 h-4" />
            Add Drone
          </Button>
        )}
      </div>

      {formMode && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle>{formMode === "create" ? "Add a new drone" : `Edit ${editingDrone?.name ?? "drone"}`}</CardTitle>
            <CardDescription>
              {formMode === "create"
                ? "Provide the basic information to register a new aircraft."
                : "Update the drone details or change its operational status."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DroneForm
              key={formMode === "edit" ? editingDrone?.drone_id ?? "edit" : "create"}
              mode={formMode}
              initialData={formMode === "edit" ? editingDrone : undefined}
              onSubmit={formMode === "create" ? handleCreateSubmit : handleEditSubmit}
              onCancel={closeForm}
              isSubmitting={formMode === "create" ? createDroneState.isPending : updateDroneState.isPending}
              error={formError}
            />
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {errorMessage && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Loading State */}
      {isInitialLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading drones...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isInitialLoading && dronesQuery.isSuccess && drones.length === 0 && (
        <div className="flex items-center justify-center py-12 border-2 border-dashed rounded-lg">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No drones found</p>
            {isAdmin && (
              <Button className="gap-2" onClick={openCreateForm}>
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
              onEdit={isAdmin ? () => openEditForm(drone) : undefined}
              onDelete={isAdmin ? handleDelete : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
