"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Filter, Loader2, Map, Plus, Search } from "lucide-react"

import { GeofenceCard } from "@/components/geofences/geofence-card"
import { GeofenceForm } from "@/components/geofences/geofence-form"
import { GeofenceMap } from "@/components/geofences/geofence-map"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ErrorDialog } from "@/components/ui/error-dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/auth.hooks"
import { useGeofences } from "@/hooks/geofences.hooks"
import { getFriendlyErrorMessage } from "@/lib/errors"
import type { CreateGeofencePayload, Geofence, GeofenceType } from "@/types/geofences.types"

const TYPE_FILTERS: (GeofenceType | "ALL")[] = ["ALL", "SAFE_ZONE", "NO_FLY_ZONE"]

export default function GeofencesPage() {
    const { isAdmin, isPilot } = useAuth()
    const canManageGeofences = isAdmin || isPilot

    const { geofences, loading, error, clearError, fetchGeofences, createGeofence, updateGeofence, deleteGeofence } = useGeofences()
    const { toast } = useToast()

    const [formMode, setFormMode] = useState<"create" | "edit" | null>(null)
    const [activeGeofence, setActiveGeofence] = useState<Geofence | null>(null)
    const [formError, setFormError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [typeFilter, setTypeFilter] = useState<GeofenceType | "ALL">("ALL")
    const [selectedGeofenceId, setSelectedGeofenceId] = useState<string | null>(null)
    const [transientError, setTransientError] = useState<string | null>(null)

    useEffect(() => {
        fetchGeofences().catch(() => null)
    }, [fetchGeofences])

    const typeCounts = useMemo(() => {
        return geofences.reduce(
            (acc, geofence) => {
                acc[geofence.type] = (acc[geofence.type] || 0) + 1
                return acc
            },
            {} as Record<GeofenceType, number>,
        )
    }, [geofences])

    const filteredGeofences = useMemo(() => {
        const query = searchTerm.toLowerCase().trim()
        return geofences.filter((geofence) => {
            const matchesSearch = query ? geofence.area_name.toLowerCase().includes(query) : true
            const matchesType = typeFilter === "ALL" ? true : geofence.type === typeFilter
            return matchesSearch && matchesType
        })
    }, [geofences, searchTerm, typeFilter])

    const hasFilters = searchTerm.trim().length > 0 || typeFilter !== "ALL"
    const isListEmpty = !loading && geofences.length === 0
    const noFilteredResults = geofences.length > 0 && filteredGeofences.length === 0

    const openCreateForm = () => {
        if (!canManageGeofences) return
        setFormMode("create")
        setActiveGeofence(null)
        setFormError(null)
    }

    const openEditForm = (geofence: Geofence) => {
        if (!canManageGeofences) return
        setFormMode("edit")
        setActiveGeofence(geofence)
        setFormError(null)
    }

    const closeForm = () => {
        setFormMode(null)
        setActiveGeofence(null)
        setFormError(null)
    }

    const handleCreate = async (payload: CreateGeofencePayload) => {
        if (!canManageGeofences) return
        setIsSubmitting(true)
        setFormError(null)
        try {
            await createGeofence(payload)
            closeForm()
            toast({
                title: "Geofence created",
                description: `${payload.area_name ?? "Area"} is now live.`,
            })
        } catch (err) {
            const message = getFriendlyErrorMessage(err, "Failed to create geofence")
            setFormError(message)
            setTransientError(message)
            toast({
                variant: "destructive",
                title: "Unable to create geofence",
                description: message,
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleUpdate = async (payload: CreateGeofencePayload) => {
        if (!canManageGeofences || !activeGeofence) return
        setIsSubmitting(true)
        setFormError(null)
        try {
            await updateGeofence(activeGeofence.geofence_id, payload)
            closeForm()
            toast({
                title: "Geofence updated",
                description: `${payload.area_name ?? activeGeofence.area_name} changes saved.`,
            })
        } catch (err) {
            const message = getFriendlyErrorMessage(err, "Failed to update geofence")
            setFormError(message)
            setTransientError(message)
            toast({
                variant: "destructive",
                title: "Unable to update geofence",
                description: message,
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (geofenceId: string) => {
        if (!canManageGeofences) return
        if (!confirm("Delete this geofence?")) return
        try {
            await deleteGeofence(geofenceId)
            toast({
                title: "Geofence deleted",
                description: "The area has been removed.",
            })
        } catch (err) {
            const message = getFriendlyErrorMessage(err, "Failed to delete geofence")
            setTransientError(message)
            toast({
                variant: "destructive",
                title: "Unable to delete geofence",
                description: message,
            })
        }
    }

    const handleSelectOnMap = (geofenceId: string) => {
        setSelectedGeofenceId(geofenceId)
        const found = geofences.find((geofence) => geofence.geofence_id === geofenceId)
        if (found) {
            setActiveGeofence(found)
        }
    }

    const aggregatedError = transientError ?? error ?? null

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-2">
                    <Breadcrumbs
                        items={[
                            { label: "Dashboard", href: "/" },
                            { label: "Geofences" },
                        ]}
                    />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Geofences</h1>
                        <p className="mt-1 text-muted-foreground">Monitor safe corridors and no-fly boundaries for every mission.</p>
                    </div>
                </div>
                {canManageGeofences && (
                    <Button onClick={openCreateForm} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add geofence
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

            {!canManageGeofences && (
                <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
                    <AlertTriangle className="h-4 w-4" />
                    You need elevated permissions to add or edit geofences. Contact an administrator if you need access.
                </div>
            )}

            <Dialog open={Boolean(formMode && canManageGeofences)} onOpenChange={(open) => (!open ? closeForm() : null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{formMode === "edit" ? `Edit ${activeGeofence?.area_name ?? "geofence"}` : "Create geofence"}</DialogTitle>
                        <DialogDescription>
                            Draw polygon points on the map or enter coordinates to describe the enforcement area.
                        </DialogDescription>
                    </DialogHeader>
                                {formMode && canManageGeofences && (
                                    <GeofenceForm
                                        key={formMode === "edit" ? activeGeofence?.geofence_id ?? "edit" : "create"}
                            mode={formMode}
                            initialData={formMode === "edit" ? activeGeofence ?? undefined : undefined}
                            onSubmit={formMode === "edit" ? handleUpdate : handleCreate}
                            onCancel={closeForm}
                            isSubmitting={isSubmitting}
                            error={formError}
                        />
                    )}
                </DialogContent>
            </Dialog>
            {/* Inline error banner replaced by modal */}

            <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                <Card className="h-[420px]">
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>Live map</CardTitle>
                            <CardDescription>Existing geofences rendered on the operational map.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Map className="h-4 w-4" />
                            {geofences.length} area{geofences.length === 1 ? "" : "s"}
                        </div>
                    </CardHeader>
                    <CardContent className="h-[300px] p-0">
                        {geofences.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                No geofences to display yet.
                            </div>
                        ) : (
                            <GeofenceMap geofences={geofences} selectedId={selectedGeofenceId} onSelect={handleSelectOnMap} />
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Filter className="h-4 w-4" /> Filters
                            {hasFilters && (
                                <button
                                    type="button"
                                    className="text-primary underline"
                                    onClick={() => {
                                        setSearchTerm("")
                                        setTypeFilter("ALL")
                                    }}
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                        <div className="mt-3 flex flex-col gap-3">
                            <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by area name" className="border-0 px-0 focus-visible:ring-0" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-muted-foreground" htmlFor="type-filter">
                                    Type
                                </label>
                                <select
                                    id="type-filter"
                                    value={typeFilter}
                                    onChange={(event) => setTypeFilter(event.target.value as GeofenceType | "ALL")}
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    {TYPE_FILTERS.map((type) => (
                                        <option key={type} value={type}>
                                            {type === "ALL" ? "All types" : type.replace(/_/g, " ")}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3 rounded-xl border border-border bg-card/80 p-4 shadow-sm sm:grid-cols-2">
                        {[
                            { label: "Safe zones", value: typeCounts.SAFE_ZONE ?? 0, accent: "text-emerald-600" },
                            { label: "No-fly zones", value: typeCounts.NO_FLY_ZONE ?? 0, accent: "text-rose-600" },
                        ].map((stat) => (
                            <div key={stat.label} className="rounded-lg border border-dashed p-3">
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                                <p className={`text-2xl font-semibold ${stat.accent}`}>{stat.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {loading && geofences.length === 0 && (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" /> Loading geofences...
                    </div>
                </div>
            )}

            {isListEmpty && (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
                    <p className="text-muted-foreground">No geofences yet</p>
                    {canManageGeofences && (
                        <Button className="mt-4 gap-2" onClick={openCreateForm}>
                            <Plus className="h-4 w-4" /> Create your first geofence
                        </Button>
                    )}
                </div>
            )}

            {filteredGeofences.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredGeofences.map((geofence) => (
                        <GeofenceCard
                            key={geofence.geofence_id}
                            geofence={geofence}
                            selected={selectedGeofenceId === geofence.geofence_id}
                            onEdit={canManageGeofences ? openEditForm : undefined}
                            onDelete={canManageGeofences ? handleDelete : undefined}
                            onFocus={setSelectedGeofenceId}
                            disabled={isSubmitting}
                        />
                    ))}
                </div>
            )}

            {noFilteredResults && (
                <div className="rounded-lg border border-dashed border-border bg-card/60 px-6 py-12 text-center text-sm text-muted-foreground">
                    No geofences match the current filters.
                    <button
                        type="button"
                        className="ml-1 text-primary underline"
                        onClick={() => {
                            setSearchTerm("")
                            setTypeFilter("ALL")
                        }}
                    >
                        Reset filters
                    </button>
                </div>
            )}
        </div>
    )
}