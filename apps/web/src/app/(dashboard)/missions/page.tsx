"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus } from "lucide-react"

import { MissionCard } from "@/components/missions/mission-card"
import { MissionForm, type MissionFormPayload } from "@/components/missions/mission-form"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/auth.hooks"
import { useDrones } from "@/hooks/drones.hooks"
import { useMissions } from "@/hooks/missions.hooks"
import type { Mission } from "@/types/missions.types"

export default function MissionsPage() {
  const { isAdmin } = useAuth()
  const { drones, fetchDrones } = useDrones()
  const { missions, loading, error, fetchMissions, createMission, updateMission, deleteMission } = useMissions()

  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null)
  const [editingMission, setEditingMission] = useState<Mission | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchMissions().catch(() => null)
  }, [fetchMissions])

  useEffect(() => {
    fetchDrones().catch(() => null)
  }, [fetchDrones])

  const droneLookup = useMemo(() => {
    const map: Record<string, string> = {}
    drones.forEach((drone) => {
      map[drone.drone_id] = drone.name
    })
    return map
  }, [drones])

  const openCreateForm = () => {
    setFormMode("create")
    setEditingMission(null)
    setFormError(null)
  }

  const openEditForm = (mission: Mission) => {
    setFormMode("edit")
    setEditingMission(mission)
    setFormError(null)
  }

  const closeForm = () => {
    setFormMode(null)
    setEditingMission(null)
    setFormError(null)
  }

  const handleCreateMission = async (payload: MissionFormPayload) => {
    setIsSubmitting(true)
    setFormError(null)
    try {
      await createMission({
        mission_name: payload.mission_name,
        drone_id: payload.drone_id,
        notes: payload.notes,
        save_as_draft: payload.save_as_draft,
        waypoints: payload.waypoints,
      })
      closeForm()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create mission"
      setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditMission = async (payload: MissionFormPayload) => {
    if (!editingMission) return
    setIsSubmitting(true)
    setFormError(null)
    try {
      await updateMission(editingMission.mission_id, {
        mission_name: payload.mission_name,
        drone_id: payload.drone_id,
        notes: payload.notes,
        save_as_draft: payload.save_as_draft,
        status: payload.status,
        waypoints: payload.waypoints,
      })
      closeForm()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update mission"
      setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (missionId: string) => {
    if (!isAdmin) return
    if (!confirm("Delete this mission?")) {
      return
    }
    try {
      await deleteMission(missionId)
    } catch (err) {
      console.error("Failed to delete mission", err)
    }
  }

  const isListEmpty = !loading && missions.length === 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Missions</h1>
          <p className="text-muted-foreground mt-1">Plan and manage missions for your fleet</p>
        </div>
        {isAdmin && (
          <Button className="gap-2" onClick={openCreateForm}>
            <Plus className="h-4 w-4" />
            Add mission
          </Button>
        )}
      </div>

      {formMode && isAdmin && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">
              {formMode === "create" ? "Create mission" : `Edit ${editingMission?.mission_name ?? "mission"}`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {formMode === "create" ? "Fill in mission details and waypoints." : "Update mission details."}
            </p>
          </div>
          <MissionForm
            key={formMode === "edit" ? editingMission?.mission_id : "create"}
            drones={drones}
            mode={formMode}
            initialData={editingMission ?? undefined}
            onSubmit={formMode === "create" ? handleCreateMission : handleEditMission}
            onCancel={closeForm}
            isSubmitting={isSubmitting}
            error={formError}
          />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && missions.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Loading missions...</p>
          </div>
        </div>
      )}

      {isListEmpty && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
          <p className="text-muted-foreground">No missions yet</p>
          {isAdmin && (
            <Button className="mt-4 gap-2" onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              Create your first mission
            </Button>
          )}
        </div>
      )}

      {missions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {missions.map((mission) => (
            <MissionCard
              key={mission.mission_id}
              mission={mission}
              droneName={droneLookup[mission.drone_id]}
              onEdit={isAdmin ? openEditForm : undefined}
              onDelete={isAdmin ? handleDelete : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
