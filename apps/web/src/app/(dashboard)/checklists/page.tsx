"use client"

import { useEffect, useMemo, useState } from "react"
import { Filter, Loader2, Plus, Search, ShieldAlert } from "lucide-react"

import { ChecklistCard } from "@/components/checklists/checklist-card"
import { ChecklistForm, type ChecklistFormPayload } from "@/components/checklists/checklist-form"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/auth.hooks"
import { useChecklists } from "@/hooks/checklists.hooks"
import type { Checklist, ChecklistType } from "@/types/checklists.types"

const CHECKLIST_TYPES: ChecklistType[] = ["PRE_FLIGHT", "POST_FLIGHT"]

export default function ChecklistsPage() {
  const { isAdmin } = useAuth()
  const { checklists, loading, error, fetchChecklists, createChecklist, updateChecklist, deleteChecklist } = useChecklists()

  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null)
  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<ChecklistType | "ALL">("ALL")
  const [sortOrder, setSortOrder] = useState<"recent" | "alphabetical">("recent")

  useEffect(() => {
    fetchChecklists().catch(() => null)
  }, [fetchChecklists])

  const canManage = isAdmin
  const isFormOpen = Boolean(formMode)

  const openCreateForm = () => {
    setFormMode("create")
    setEditingChecklist(null)
    setFormError(null)
  }

  const openEditForm = (checklist: Checklist) => {
    setFormMode("edit")
    setEditingChecklist(checklist)
    setFormError(null)
  }

  const closeForm = () => {
    setFormMode(null)
    setEditingChecklist(null)
    setFormError(null)
  }

  const handleCreateChecklist = async (payload: ChecklistFormPayload) => {
    if (!canManage) return
    setIsSubmitting(true)
    setFormError(null)
    try {
      await createChecklist(payload)
      closeForm()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create checklist"
      setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateChecklist = async (payload: ChecklistFormPayload) => {
    if (!canManage || !editingChecklist) return
    setIsSubmitting(true)
    setFormError(null)
    try {
      await updateChecklist(editingChecklist.checklist_id, payload)
      closeForm()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update checklist"
      setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteChecklist = async (checklistId: string) => {
    if (!canManage) return
    if (!confirm("Delete this checklist template?")) {
      return
    }
    try {
      await deleteChecklist(checklistId)
    } catch (err) {
      console.error("Failed to delete checklist", err)
    }
  }

  const typeCounts = useMemo(() => {
    return checklists.reduce<Record<string, number>>((acc, checklist) => {
      const type = (checklist.type || "UNKNOWN").toString()
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})
  }, [checklists])

  const filteredChecklists = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase().trim()
    return [...checklists]
      .filter((checklist) => {
        const matchesSearch = normalizedSearch
          ? checklist.title.toLowerCase().includes(normalizedSearch)
          : true
        const matchesType = typeFilter === "ALL" ? true : checklist.type === typeFilter
        return matchesSearch && matchesType
      })
      .sort((a, b) => {
        if (sortOrder === "alphabetical") {
          return a.title.localeCompare(b.title)
        }
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        return dateB - dateA
      })
  }, [checklists, searchTerm, typeFilter, sortOrder])

  const hasFiltersApplied = searchTerm.trim().length > 0 || typeFilter !== "ALL" || sortOrder !== "recent"
  const isListEmpty = !loading && checklists.length === 0
  const noFilteredResults = checklists.length > 0 && filteredChecklists.length === 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Checklist templates</h1>
          <p className="text-muted-foreground mt-1">
            Define pre-flight and post-flight steps to enforce consistent procedures.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreateForm} className="gap-2">
            <Plus className="h-4 w-4" />
            Add checklist
          </Button>
        )}
      </div>

      {!canManage && (
        <div className="flex gap-3 rounded-lg border border-dashed border-amber-500/60 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <p>
            You have read-only access. Contact an administrator if you need permission to create or update checklist templates.
          </p>
        </div>
      )}

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
            <DialogTitle>{formMode === "edit" ? `Edit ${editingChecklist?.title ?? "checklist"}` : "Create checklist"}</DialogTitle>
            <DialogDescription>
              {formMode === "edit"
                ? "Update the template title, type, or checklist steps."
                : "Give the template a name, choose its type, and list each procedural step."}
            </DialogDescription>
          </DialogHeader>
          {formMode && canManage && (
            <ChecklistForm
              key={formMode === "edit" ? editingChecklist?.checklist_id : "create-checklist"}
              mode={formMode}
              initialData={editingChecklist ?? undefined}
              onSubmit={formMode === "create" ? handleCreateChecklist : handleUpdateChecklist}
              onCancel={closeForm}
              isSubmitting={isSubmitting}
              error={formError}
            />
          )}
        </DialogContent>
      </Dialog>

      {error && <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      {checklists.length > 0 && (
        <div className="grid gap-4 rounded-xl border border-border bg-card p-4 shadow-sm md:grid-cols-2">
          {CHECKLIST_TYPES.map((type) => (
            <div key={type} className="rounded-lg border border-dashed p-3">
              <p className="text-xs text-muted-foreground">{type.replace(/_/g, " ")}</p>
              <p className="text-2xl font-semibold">{typeCounts[type] ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      {checklists.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> Checklist filters
            {hasFiltersApplied && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("")
                  setTypeFilter("ALL")
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
                placeholder="Search by checklist title"
                className="border-0 px-0 focus-visible:ring-0"
              />
            </div>
            <div className="flex w-full flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="type-filter">
                Type
              </label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as ChecklistType | "ALL")}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="ALL">All types</option>
                {CHECKLIST_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
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
                onChange={(event) => setSortOrder(event.target.value as "recent" | "alphabetical")}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="recent">Newest first</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading && checklists.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Loading checklist templates...</p>
          </div>
        </div>
      )}

      {isListEmpty && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
          <p className="text-muted-foreground">No checklist templates yet</p>
          {canManage && (
            <Button className="mt-4 gap-2" onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              Create your first checklist
            </Button>
          )}
        </div>
      )}

      {filteredChecklists.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredChecklists.map((checklist) => (
            <ChecklistCard
              key={checklist.checklist_id}
              checklist={checklist}
              onEdit={canManage ? openEditForm : undefined}
              onDelete={canManage ? handleDeleteChecklist : undefined}
              disableActions={isSubmitting}
            />
          ))}
        </div>
      )}

      {noFilteredResults && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          <p>No checklists match the current filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm("")
              setTypeFilter("ALL")
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
