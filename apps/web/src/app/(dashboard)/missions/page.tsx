"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Filter, Loader2, MapPin, Plus, Search } from "lucide-react"

import { MissionCard } from "@/components/missions/mission-card"
import { MissionForm, type MissionFormPayload } from "@/components/missions/mission-form"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ErrorDialog } from "@/components/ui/error-dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/auth.hooks"
import { useDrones } from "@/hooks/drones.hooks"
import { useMissions } from "@/hooks/missions.hooks"
import { getFriendlyErrorMessage } from "@/lib/errors"
import type { Mission, MissionStatus, MissionStatusAction } from "@/types/missions.types"

export default function MissionsPage() {
  const { user, isAdmin, isPilot } = useAuth()
  const { drones, fetchDrones } = useDrones()
  const {
    missions,
    loading,
    error,
    clearError,
    fetchMissions,
    createMission,
    updateMission,
    deleteMission,
    changeMissionStatus,
  } = useMissions()
  const { toast } = useToast()

  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null)
  const [editingMission, setEditingMission] = useState<Mission | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<MissionStatus | "ALL">("ALL")
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest">("recent")
  const [statusActionMissionId, setStatusActionMissionId] = useState<string | null>(null)
  const [statusActionError, setStatusActionError] = useState<string | null>(null)
  const [transientError, setTransientError] = useState<string | null>(null)

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

  const canManageMissions = isAdmin || isPilot
  const canTriggerStatusAction = isAdmin || isPilot
  const isFormOpen = Boolean(formMode)

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
    if (!canManageMissions) return
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
      toast({
        title: "Mission created",
        description: `${payload.mission_name} is ready to plan.`,
      })
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Failed to create mission")
      setFormError(message)
      setTransientError(message)
      toast({
        variant: "destructive",
        title: "Unable to create mission",
        description: message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditMission = async (payload: MissionFormPayload) => {
    if (!editingMission || !canManageMissions) return
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
      toast({
        title: "Mission updated",
        description: `${payload.mission_name} changes saved.`,
      })
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Failed to update mission")
      setFormError(message)
      setTransientError(message)
      toast({
        variant: "destructive",
        title: "Unable to update mission",
        description: message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (missionId: string) => {
    if (!canManageMissions) return
    if (!confirm("Delete this mission?")) {
      return
    }
    try {
      await deleteMission(missionId)
      toast({
        title: "Mission deleted",
        description: "The mission has been removed from your list.",
      })
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Failed to delete mission")
      setTransientError(message)
      toast({
        variant: "destructive",
        title: "Unable to delete mission",
        description: message,
      })
    }
  }

  const canPerformStatusAction = useCallback(
    (mission: Mission, action: MissionStatusAction) => {
  const isOwner = mission.created_by_user_id === user?.id
  const adminIsOwner = isAdmin && isOwner
      if (action === "approve" || action === "reject" || action === "cancel") {
        return isAdmin
      }
      if (action === "submit") {
        return isOwner || isAdmin
      }
      if (action === "start" || action === "complete") {
        return (isOwner && isPilot) || adminIsOwner
      }
      return false
    },
    [isAdmin, isPilot, user?.id],
  )

  const handleStatusAction = async (mission: Mission, action: MissionStatusAction) => {
    if (!canPerformStatusAction(mission, action)) {
      setStatusActionError("You do not have permission to perform this action")
      return
    }
    const confirmDestructive = action === "reject" || action === "cancel"
    const confirmationMessage =
      action === "submit"
        ? "Submit this mission for approval?"
        : action === "approve"
          ? "Approve this mission?"
          : action === "start"
            ? "Mark this mission as in progress?"
            : action === "complete"
              ? "Mark this mission as completed?"
              : action === "reject"
                ? "Reject this mission?"
                : "Cancel this mission?"

    if (confirmDestructive && !confirm(confirmationMessage)) {
      return
    }

    setStatusActionMissionId(mission.mission_id)
    setStatusActionError(null)
    try {
      await changeMissionStatus(mission.mission_id, action)
      toast({
        title: "Status updated",
        description: `${mission.mission_name} is now ${action === "complete" ? "completed" : action}.`,
      })
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Failed to update mission status")
      setStatusActionError(message)
      toast({
        variant: "destructive",
        title: "Status change failed",
        description: message,
      })
    } finally {
      setStatusActionMissionId(null)
    }
  }

  const statusCounts = useMemo(() => {
    return missions.reduce<Record<string, number>>((acc, mission) => {
      const status = mission.status || "DRAFT"
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})
  }, [missions])

  const filteredMissions = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase().trim()
    return missions
      .filter((mission) => {
        const matchesSearch = normalizedSearch
          ? mission.mission_name.toLowerCase().includes(normalizedSearch) || mission.notes?.toLowerCase().includes(normalizedSearch)
          : true
        const matchesStatus = statusFilter === "ALL" ? true : mission.status === statusFilter
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        return sortOrder === "recent" ? dateB - dateA : dateA - dateB
      })
  }, [missions, searchTerm, statusFilter, sortOrder])

  const isListEmpty = !loading && missions.length === 0
  const hasFiltersApplied = searchTerm.trim().length > 0 || statusFilter !== "ALL" || sortOrder !== "recent"
  const noFilteredResults = missions.length > 0 && filteredMissions.length === 0
  const aggregatedError = transientError ?? statusActionError ?? error ?? null

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Missions" },
            ]}
          />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Missions</h1>
            <p className="text-muted-foreground mt-1">Plan and manage missions for your fleet</p>
          </div>
        </div>
        {canManageMissions && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/geofences">
                <MapPin className="h-4 w-4" />
                Manage geofences
              </Link>
            </Button>
            <Button className="gap-2" onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              Add mission
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
        <MapPin className="h-4 w-4 shrink-0" />
        <span>
          Missions respect the safe corridors and no-fly zones you define. Need to adjust boundaries before launching?
          <Link href="/geofences" className="ml-1 underline">
            Open geofences
          </Link>
          .
        </span>
      </div>

      {!canManageMissions && (
        <div className="rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
          You need an <span className="font-semibold">admin</span> or <span className="font-semibold">pilot</span> role to create, edit, or delete missions.
          If you believe this is an error, please contact an administrator.
        </div>
      )}

      <Dialog
        open={isFormOpen && canManageMissions}
        onOpenChange={(open) => {
          if (!open) {
            closeForm()
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formMode === "edit" ? `Edit ${editingMission?.mission_name ?? "mission"}` : "Create mission"}</DialogTitle>
            <DialogDescription>
              {formMode === "edit" ? "Update mission metadata, drone assignments, and waypoints." : "Fill in mission details, assign a drone, and plot waypoints from the map."}
            </DialogDescription>
          </DialogHeader>
          {formMode && canManageMissions && (
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
          )}
        </DialogContent>
      </Dialog>

      <ErrorDialog
        open={Boolean(aggregatedError)}
        message={aggregatedError ?? undefined}
        onOpenChange={(open) => {
          if (!open) {
            setTransientError(null)
            setStatusActionError(null)
            clearError()
          }
        }}
      />

      {missions.length > 0 && (
        <div className="grid gap-4 rounded-xl border border-border bg-card p-4 shadow-sm md:grid-cols-4">
          {["DRAFT", "PENDING_APPROVAL", "APPROVED", "IN_PROGRESS", "COMPLETED"].map((status) => (
            <div key={status} className="rounded-lg border border-dashed p-3">
              <p className="text-xs text-muted-foreground">{status.replace(/_/g, " ")}</p>
              <p className="text-2xl font-semibold">{statusCounts[status] ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      {missions.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> Mission filters
            {hasFiltersApplied && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("ALL")
                  setSortOrder("recent")
                }}
                className="text-primary underline"
              >
                Reset
              </button>
            )}
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-md border border-input bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name or notes"
                className="border-0 px-0 focus-visible:ring-0"
              />
            </div>
            <div className="flex w-full flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="status-filter">
                Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as MissionStatus | "ALL")}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="ALL">All statuses</option>
                {["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "IN_PROGRESS", "COMPLETED", "CANCELED"].map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex w-full flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="sort-order">
                Sort
              </label>
              <select
                id="sort-order"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as "recent" | "oldest")}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="recent">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>
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
          {canManageMissions && (
            <Button className="mt-4 gap-2" onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              Create your first mission
            </Button>
          )}
        </div>
      )}

      {filteredMissions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMissions.map((mission) => (
            <MissionCard
              key={mission.mission_id}
              mission={mission}
              droneName={droneLookup[mission.drone_id]}
              onEdit={canManageMissions ? openEditForm : undefined}
              onDelete={canManageMissions ? handleDelete : undefined}
              onStatusAction={canTriggerStatusAction ? handleStatusAction : undefined}
              canPerformAction={(action) => canPerformStatusAction(mission, action)}
              disableActions={isSubmitting}
              isStatusUpdating={statusActionMissionId === mission.mission_id}
            />
          ))}
        </div>
      )}

      {noFilteredResults && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <p>No missions match the current filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm("")
              setStatusFilter("ALL")
              setSortOrder("recent")
            }}
            className="text-primary underline"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  )
}
