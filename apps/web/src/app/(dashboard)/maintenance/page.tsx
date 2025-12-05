"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Search, ShieldAlert } from "lucide-react"

import { MaintenanceLogCard } from "@/components/checklists/maintenance-log-card"
import { MaintenanceLogForm, type MaintenanceLogFormPayload } from "@/components/checklists/maintenance-log-form"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ErrorDialog } from "@/components/ui/error-dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/auth.hooks"
import { useDrones } from "@/hooks/drones.hooks"
import { useMaintenance } from "@/hooks/maintenance.hooks"
import { getFriendlyErrorMessage } from "@/lib/errors"
import type { MaintenanceLog } from "@/types/maintenance.types"

export default function MaintenancePage() {
  const { isAdmin } = useAuth()
  const { drones, fetchDrones } = useDrones()
  const { toast } = useToast()
  const { logs, loading, error, clearError, fetchLogs, createLog, updateLog, deleteLog } = useMaintenance()

  const [selectedDroneId, setSelectedDroneId] = useState<string>("")
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null)
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest">("recent")
  const [transientError, setTransientError] = useState<string | null>(null)

  useEffect(() => {
    fetchDrones().catch(() => null)
  }, [fetchDrones])

  useEffect(() => {
    if (!selectedDroneId && drones.length > 0) {
      const defaultDroneId = drones[0].drone_id
      setSelectedDroneId(defaultDroneId)
      fetchLogs(defaultDroneId).catch(() => null)
    }
  }, [drones, fetchLogs, selectedDroneId])

  const handleSelectDrone = (droneId: string) => {
    setSelectedDroneId(droneId)
    fetchLogs(droneId).catch(() => null)
  }

  const canManage = isAdmin
  const isFormOpen = Boolean(formMode)

  const openCreateForm = () => {
    if (!selectedDroneId) return
    setFormMode("create")
    setEditingLog(null)
    setFormError(null)
  }

  const openEditForm = (log: MaintenanceLog) => {
    setFormMode("edit")
    setEditingLog(log)
    setFormError(null)
  }

  const closeForm = () => {
    setFormMode(null)
    setEditingLog(null)
    setFormError(null)
  }

  const handleCreateLog = async (payload: MaintenanceLogFormPayload) => {
    if (!canManage) return
    setIsSubmitting(true)
    setFormError(null)
    try {
      await createLog(payload.drone_id, {
        notes: payload.notes,
        log_date: payload.log_date,
      })
      closeForm()
      toast({
        title: "Maintenance logged",
        description: `${payload.log_date} entry saved.`,
      })
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Failed to create maintenance log")
      setFormError(message)
      setTransientError(message)
      toast({
        variant: "destructive",
        title: "Unable to create log",
        description: message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateLog = async (payload: MaintenanceLogFormPayload) => {
    if (!canManage || !editingLog) return
    setIsSubmitting(true)
    setFormError(null)
    try {
      await updateLog(editingLog.log_id, {
        notes: payload.notes,
        log_date: payload.log_date,
      })
      closeForm()
      toast({
        title: "Maintenance updated",
        description: `Entry for ${payload.log_date} updated.`,
      })
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Failed to update maintenance log")
      setFormError(message)
      setTransientError(message)
      toast({
        variant: "destructive",
        title: "Unable to update log",
        description: message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteLog = async (logId: string) => {
    if (!canManage) return
    if (!confirm("Delete this maintenance log?")) {
      return
    }
    try {
      await deleteLog(logId)
      toast({
        title: "Maintenance deleted",
        description: "The log entry has been removed.",
      })
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Failed to delete maintenance log")
      setTransientError(message)
      toast({
        variant: "destructive",
        title: "Unable to delete log",
        description: message,
      })
    }
  }

  const filteredLogs = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase().trim()
    return [...logs]
      .filter((log) => {
        if (!normalizedSearch) return true
        return log.notes.toLowerCase().includes(normalizedSearch)
      })
      .sort((a, b) => {
        const dateA = a.log_date ? new Date(a.log_date).getTime() : 0
        const dateB = b.log_date ? new Date(b.log_date).getTime() : 0
        return sortOrder === "recent" ? dateB - dateA : dateA - dateB
      })
  }, [logs, searchTerm, sortOrder])

  const selectedDrone = drones.find((drone) => drone.drone_id === selectedDroneId)
  const isListEmpty = !loading && logs.length === 0
  const noFilteredResults = logs.length > 0 && filteredLogs.length === 0

  const aggregatedError = transientError ?? error ?? null

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Maintenance" },
            ]}
          />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Maintenance logs</h1>
            <p className="text-muted-foreground mt-1">
              Track inspections and repairs across your fleet.
            </p>
          </div>
        </div>
        {canManage && (
          <Button className="gap-2" onClick={openCreateForm} disabled={!selectedDroneId}>
            <Plus className="h-4 w-4" />
            Log maintenance
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

      {!canManage && (
        <div className="flex gap-3 rounded-lg border border-dashed border-amber-500/60 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <p>
            You have read-only access. Contact an administrator to manage maintenance logs.
          </p>
        </div>
      )}

      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 shadow-sm md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Drone</span>
          <select
            value={selectedDroneId}
            onChange={(event) => handleSelectDrone(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select drone</option>
            {drones.map((drone) => (
              <option key={drone.drone_id} value={drone.drone_id}>
                {drone.name} ({drone.model})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Sort</span>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as "recent" | "oldest")}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="recent">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Search notes</span>
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Filter by maintenance notes"
              className="border-0 px-0"
            />
          </div>
        </div>
      </div>

      <Dialog
        open={isFormOpen && canManage}
        onOpenChange={(open) => {
          if (!open) {
            closeForm()
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formMode === "edit" ? "Edit maintenance log" : "Log maintenance"}</DialogTitle>
            <DialogDescription>
              {formMode === "edit"
                ? "Update the maintenance notes or log date."
                : "Select a drone, choose the log date, and describe the maintenance performed."}
            </DialogDescription>
          </DialogHeader>
          {formMode && canManage && (
            <MaintenanceLogForm
              key={formMode === "edit" ? editingLog?.log_id : `create-${selectedDroneId}`}
              drones={drones}
              mode={formMode}
              initialData={editingLog ?? undefined}
              onSubmit={formMode === "create" ? handleCreateLog : handleUpdateLog}
              onCancel={closeForm}
              isSubmitting={isSubmitting}
              error={formError}
            />
          )}
        </DialogContent>
      </Dialog>
  {/* Inline error banner replaced by modal */}

      {loading && logs.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Loading maintenance logs...</p>
          </div>
        </div>
      )}

      {isListEmpty && selectedDrone && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
          <p className="text-muted-foreground">No maintenance logs for {selectedDrone.name} yet</p>
          {canManage && (
            <Button className="mt-4 gap-2" onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              Log maintenance
            </Button>
          )}
        </div>
      )}

      {filteredLogs.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredLogs.map((log) => (
            <MaintenanceLogCard
              key={log.log_id}
              log={log}
              droneName={selectedDrone?.name}
              onEdit={canManage ? openEditForm : undefined}
              onDelete={canManage ? handleDeleteLog : undefined}
              disableActions={isSubmitting}
            />
          ))}
        </div>
      )}

      {noFilteredResults && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <p>No maintenance logs match the current filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm("")
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
